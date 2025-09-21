"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Play, Calendar, Settings, Trash2 } from "lucide-react"

interface Workflow {
  id: string
  name: string
  description: string
  trigger_type: string
  workflow_steps: any[]
  is_active: boolean
  created_at: string
}

export function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      const response = await fetch("/api/orchestration/workflows")
      if (!response.ok) throw new Error("Failed to fetch workflows")

      const data = await response.json()
      setWorkflows(data.workflows || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch("/api/orchestration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          input_data: {},
        }),
      })

      if (!response.ok) throw new Error("Failed to execute workflow")

      const result = await response.json()

      toast({
        title: "Workflow Executed",
        description: `Workflow completed with status: ${result.status}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute workflow",
        variant: "destructive",
      })
    }
  }

  const scheduleWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch("/api/orchestration/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          schedule_type: "daily",
          schedule_config: { time: "09:00" },
        }),
      })

      if (!response.ok) throw new Error("Failed to schedule workflow")

      toast({
        title: "Workflow Scheduled",
        description: "Workflow has been scheduled to run daily at 9:00 AM",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule workflow",
        variant: "destructive",
      })
    }
  }

  const getTriggerBadge = (triggerType: string) => {
    const colors = {
      manual: "bg-blue-100 text-blue-800",
      scheduled: "bg-green-100 text-green-800",
      webhook: "bg-purple-100 text-purple-800",
    }
    return colors[triggerType as keyof typeof colors] || colors.manual
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading workflows...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
          <CardDescription>Manage and monitor your automated AI workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No workflows created yet. Use the Workflow Builder to create your first automation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{workflow.name}</h3>
                          <Badge className={getTriggerBadge(workflow.trigger_type)}>{workflow.trigger_type}</Badge>
                          <Badge variant={workflow.is_active ? "default" : "secondary"}>
                            {workflow.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{workflow.workflow_steps.length} steps</span>
                          <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => executeWorkflow(workflow.id)}>
                          <Play className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => scheduleWorkflow(workflow.id)}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Workflow Steps Preview */}
                    <div className="flex flex-wrap gap-2">
                      {workflow.workflow_steps.map((step, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {index + 1}. {step.name || step.type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
