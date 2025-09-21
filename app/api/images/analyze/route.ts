import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

require('dotenv').config()
const model_name=process.env.MODEL_NAME!
const model_baseurl=process.env.MODEL_BASE_URL!
const model_apikey=process.env.MODEL_API_KEY
const provider = createOpenAICompatible({
  name: "provider-name",
  apiKey: model_apikey,
  baseURL: model_baseurl,
})
console.log(model_name,model_apikey,model_baseurl)

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

// Helper: parse JSON inside custom delimiters <<<JSON>>> ... <<<END>>>
function parseDelimitedJSON(raw: string) {
  const match = raw.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/);
  if (!match) {
    throw new Error("No JSON content found in LLM output");
  }
  return JSON.parse(match[1].trim());
}

// Helper: extract JSON from markdown code blocks or parse directly
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

    // Try to extract from inline code
    const inlineCodeMatch = raw.match(/`([\s\S]*?)`/);
    if (inlineCodeMatch) {
      return JSON.parse(inlineCodeMatch[1].trim());
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

      // Parse the AI response which may be wrapped in markdown code blocks
      const parsedResponse = parseAIResponse(analysisText);

      // Validate against schema
      return imageAnalysisSchema.parse(parsedResponse);
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt} failed, retrying...`, err);
    }
  }

  throw new Error(`AI analysis failed after ${retries} retries: ${lastError}`);
}


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;
    const imageName = formData.get("imageName") as string;
    const googleDriveFileId = formData.get("googleDriveFileId") as string;

    if (!file) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;

    // Insert initial DB record
    const { data: imageRecord, error: insertError } = await supabase
      .from("image_captions")
      .insert({
        user_id: user.id,
        image_url: `data:${mimeType};base64,${base64}`,
        image_name: imageName || file.name,
        google_drive_file_id: googleDriveFileId,
        generated_caption: "",
        generated_hashtags: [],
        processing_status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    try {
      console.log("Starting AI analysis with retry...");
      const parsed = await generateAnalysisWithRetry(base64);
      console.log("AI analysis parsed successfully:", parsed);

      // Update DB record
      const { data: updatedRecord, error: updateError } = await supabase
        .from("image_captions")
        .update({
          generated_caption: parsed.caption,
          generated_hashtags: parsed.hashtags,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", imageRecord.id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      // Insert agent task record
      await supabase.from("agent_tasks").insert({
        user_id: user.id,
        task_type: "image_processing",
        task_status: "completed",
        task_data: {
          image_caption_id: imageRecord.id,
          image_name: imageName || file.name,
          google_drive_file_id: googleDriveFileId,
        },
        result_data: {
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          analysis_details: parsed,
          processed_at: new Date().toISOString(),
        },
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        image_caption: updatedRecord,
        analysis: parsed,
      });
    } catch (aiError) {
      console.error("AI analysis failed after retries:", aiError);

      await supabase
        .from("image_captions")
        .update({ processing_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", imageRecord.id);

      return NextResponse.json(
        { error: "Failed to analyze image", details: aiError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in image analysis:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
