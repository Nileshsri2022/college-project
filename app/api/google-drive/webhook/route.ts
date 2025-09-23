import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleDriveService } from '@/lib/google-drive-service';
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

require('dotenv').config();
const model_name = process.env.MODEL_NAME!;
const model_baseurl = process.env.MODEL_BASE_URL!;
const model_apikey = process.env.MODEL_API_KEY;
const provider = createOpenAICompatible({
  name: "provider-name",
  apiKey: model_apikey,
  baseURL: model_baseurl,
});

// Zod schema for image analysis
const imageAnalysisSchema = z.object({
  caption: z.string().describe("A detailed, engaging caption describing the image"),
  hashtags: z.array(z.string()).describe("Relevant hashtags for social media (without # symbol)"),
  description: z.string().describe("Detailed description of what's in the image"),
  mood: z.string().describe("The mood or atmosphere of the image"),
  colors: z.array(z.string()).describe("Dominant colors in the image"),
  objects: z.array(z.string()).describe("Main objects or subjects visible in the image"),
  setting: z.string().describe("The setting or location type of the image"),
});

// Helper: parse JSON from AI response
function parseAIResponse(raw: string) {
  try {
    // First try to parse as direct JSON
    return JSON.parse(raw.trim());
  } catch {
    // If that fails, try to extract from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }

    // Try to find JSON-like content between common delimiters
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0].trim());
    }

    throw new Error("Could not parse JSON from AI response");
  }
}

// Retry wrapper for AI calls
async function generateAnalysisWithRetry(base64: string, retries = 1) {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🤖 === LLM ANALYSIS ATTEMPT ${attempt}/${retries} ===`);

      const { text: analysisText } = await generateText({
        model: provider(model_name),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze the image and return ONLY a JSON object matching this exact schema:

{
  "caption": "string",
  "hashtags": ["string"],
  "description": "string",
  "mood": "string",
  "colors": ["string"],
  "objects": ["string"],
  "setting": "string"
}

Return only valid JSON without any markdown formatting or code blocks. Do not wrap the JSON in \`\`\`json or any other formatting.`,
              },
              { type: "image", image: base64 },
            ],
          },
        ],
      });

      // Parse the AI response
      const parsedResponse = parseAIResponse(analysisText);
      const validatedResponse = imageAnalysisSchema.parse(parsedResponse);

      console.log(`🎉 === LLM ANALYSIS ATTEMPT ${attempt} SUCCESSFUL ===`);
      return validatedResponse;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  === LLM ANALYSIS ATTEMPT ${attempt} FAILED ===`);
      console.warn('Error details:', err);
    }
  }

  console.error('💥 === ALL LLM ANALYSIS ATTEMPTS FAILED ===');
  throw new Error(`AI analysis failed after ${retries} retries: ${lastError}`);
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n🔔 === GOOGLE DRIVE WEBHOOK RECEIVED ===');
    console.log(`⏰ Webhook time: ${new Date().toISOString()}`);

    // Check if this is a Google Drive webhook by looking for specific headers
    const userAgent = request.headers.get('user-agent') || '';
    const googResourceUri = request.headers.get('x-goog-resource-uri');
    const isGoogleDrive = userAgent.includes('google-api') || googResourceUri !== null;

    console.log('🔍 Request analysis:', {
      userAgent,
      googResourceUri,
      isGoogleDrive,
      allHeaders: Object.fromEntries(request.headers.entries())
    });

    if (!isGoogleDrive) {
      console.log('⚠️ Not a Google Drive webhook request, checking authentication...');
      // For non-Google requests, require authentication
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.log('❌ Authentication required for non-Google requests');
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }

    const body = await request.json();
    console.log('📥 Webhook body:', JSON.stringify(body, null, 2));

    // Handle different webhook types
    if (body.kind === 'api#channel') {
      console.log('📡 Channel notification received');

      // This is a channel subscription confirmation
      if (body.resourceId) {
        console.log('✅ Channel subscription confirmed');
        return NextResponse.json({ status: 'ok' });
      }
    }

    // Handle file change notifications
    if (body.kind === 'drive#changeList') {
      console.log('📁 File change notification received');

      try {
        const supabase = await createClient();

        // Get all users who have Google Drive monitoring enabled
        const { data: users, error: usersError } = await supabase
          .from('google_drive_tokens')
          .select('user_id')
          .not('user_id', 'is', null);

        if (usersError) {
          console.error('❌ Failed to get users:', usersError);
          return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
        }

        console.log(`👥 Found ${users.length} users with Google Drive tokens`);

        // Process changes for each user
        for (const user of users) {
          try {
            console.log(`\n👤 Processing changes for user: ${user.user_id}`);

            const driveService = new GoogleDriveService(user.user_id);

            // Check if user is authenticated
            const isAuthenticated = await driveService.isAuthenticated();
            if (!isAuthenticated) {
              console.log(`⚠️ User ${user.user_id} is not authenticated, skipping`);
              continue;
            }

            // Get user's monitored folders
            const { data: monitoredFolders, error: foldersError } = await supabase
              .from('google_drive_monitored_folders')
              .select('*')
              .eq('user_id', user.user_id)
              .eq('is_active', true);

            if (foldersError) {
              console.error(`❌ Failed to get monitored folders for user ${user.user_id}:`, foldersError);
              continue;
            }

            if (!monitoredFolders || monitoredFolders.length === 0) {
              console.log(`📁 No monitored folders for user ${user.user_id}`);
              continue;
            }

            console.log(`📁 Found ${monitoredFolders.length} monitored folders for user ${user.user_id}`);

            // Process each monitored folder
            for (const folder of monitoredFolders) {
              try {
                console.log(`\n📂 Processing folder: ${folder.folder_name} (${folder.folder_id})`);

                // Get files from the folder
                const files = await driveService.listFiles(folder.folder_id);

                // Filter for image files that haven't been processed
                const { data: existingImages, error: dbError } = await supabase
                  .from('image_captions')
                  .select('google_drive_file_id')
                  .eq('user_id', user.user_id)
                  .not('google_drive_file_id', 'is', null);

                const processedFileIds = new Set(
                  existingImages?.map(img => img.google_drive_file_id) || []
                );

                const unprocessedFiles = files.filter(file =>
                  !processedFileIds.has(file.id) &&
                  folder.image_formats.some((format: string) =>
                    file.name.toLowerCase().endsWith(format)
                  )
                );

                console.log(`🆕 Found ${unprocessedFiles.length} unprocessed images in folder ${folder.folder_name}`);

                // Process each unprocessed file
                for (const file of unprocessedFiles) {
                  try {
                    console.log(`\n🖼️ === PROCESSING IMAGE: ${file.name} ===`);
                    console.log(`📄 File ID: ${file.id}`);

                    // Create database record with processing status
                    const { data: imageRecord, error: insertError } = await supabase
                      .from("image_captions")
                      .insert({
                        user_id: user.user_id,
                        image_url: file.webViewLink,
                        image_name: file.name,
                        google_drive_file_id: file.id,
                        generated_caption: "",
                        generated_hashtags: [],
                        processing_status: "processing",
                      })
                      .select()
                      .single();

                    if (insertError) {
                      console.error("❌ Failed to insert image record:", insertError);
                      continue;
                    }

                    console.log(`✅ Database record created with ID: ${imageRecord.id}`);

                    // Get file content as base64
                    const base64Data = await driveService.getFileContent(file.id);
                    console.log(`✅ Downloaded ${base64Data.length} bytes of image data`);

                    // Analyze with AI
                    console.log('🤖 Sending image to LLM for analysis...');
                    const analysis = await generateAnalysisWithRetry(base64Data);

                    console.log('🎉 === LLM ANALYSIS COMPLETE ===');

                    // Update database record
                    const { error: updateError } = await supabase
                      .from("image_captions")
                      .update({
                        generated_caption: analysis.caption,
                        generated_hashtags: analysis.hashtags,
                        processing_status: "completed",
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", imageRecord.id);

                    if (updateError) {
                      console.error("❌ Failed to update image record:", updateError);
                      continue;
                    }

                    console.log('✅ Database updated successfully');

                    // Create agent task record
                    await supabase.from("agent_tasks").insert({
                      user_id: user.user_id,
                      task_type: "image_processing",
                      task_status: "completed",
                      task_data: {
                        image_caption_id: imageRecord.id,
                        image_name: file.name,
                        google_drive_file_id: file.id,
                        folder_id: folder.folder_id,
                        folder_name: folder.folder_name,
                      },
                      result_data: {
                        caption: analysis.caption,
                        hashtags: analysis.hashtags,
                        analysis_details: analysis,
                        processed_at: new Date().toISOString(),
                      },
                      completed_at: new Date().toISOString(),
                    });

                    console.log('✅ Agent task record created');
                    console.log(`✅ Successfully processed: ${file.name}`);

                  } catch (error) {
                    console.error(`❌ === FAILED TO PROCESS IMAGE: ${file.name} ===`);
                    console.error('Error details:', error);

                    // Mark as failed in database
                    await supabase
                      .from("image_captions")
                      .update({
                        processing_status: "failed",
                        updated_at: new Date().toISOString()
                      })
                      .eq("google_drive_file_id", file.id)
                      .eq("user_id", user.user_id);

                    console.error(`❌ Failed to process: ${file.name}`);
                  }
                }

              } catch (folderError) {
                console.error(`❌ Error processing folder ${folder.folder_name}:`, folderError);
              }
            }

          } catch (userError) {
            console.error(`❌ Error processing user ${user.user_id}:`, userError);
          }
        }

        return NextResponse.json({ status: 'processed' });
      } catch (innerError) {
        console.error('❌ Error in drive#changeList processing:', innerError);
        return NextResponse.json({ error: 'Failed to process changes' }, { status: 500 });
      }
    }

    console.log('⚠️ Unknown webhook type received');
    return NextResponse.json({ status: 'unknown' });

  } catch (error) {
    console.error('\n💥 === GOOGLE DRIVE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('❌ === WEBHOOK PROCESSING FAILED ===\n');
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
