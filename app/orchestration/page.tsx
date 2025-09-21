"use client"

import { WorkflowBuilder } from "@/components/workflow-builder"
import { WorkflowDashboard } from "@/components/workflow-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, BarChart3 } from "lucide-react"

export default function OrchestrationPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Agent Orchestration</h1>
        <p className="text-muted-foreground">
          Create and manage automated workflows that coordinate multiple AI agents
        </p>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Workflow Builder
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <WorkflowBuilder />
        </TabsContent>

        <TabsContent value="dashboard">
          <WorkflowDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
