"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Play, Settings, Calendar, Mail, Clock } from "lucide-react"

interface WorkflowStep {
  id: string
  name: string
  type: string
  config: any
}

const STEP_TYPES = [
  { value: "birthday_check", label: "Check Birthdays", icon: Calendar },
  { value: "sentiment_analysis", label: "Analyze Email Sentiment", icon: Mail },
  { value: "send_notifications", label: "Send Notifications", icon: Mail },
  { value: "delay", label: "Wait/Delay", icon: Clock },
  { value: "conditional", label: "Conditional Logic", icon: Settings },
]

export function WorkflowBuilder() {
  const [workflow, setWorkflow] = useState({
    name: "",
    description: "",
    trigger_type: "manual",
    trigger_config: {},
    workflow_steps: [] as WorkflowStep[],
  })
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: `Step ${workflow.workflow_steps.length + 1}`,
      type: "birthday_check",
      config: {},
    }
    setWorkflow((prev) => ({
      ...prev,
      workflow_steps: [...prev.workflow_steps, newStep],
    }))
  }

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflow((prev) => ({
      ...prev,
      workflow_steps: prev.workflow_steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    }))
  }

  const removeStep = (stepId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      workflow_steps: prev.workflow_steps.filter((step) => step.id !== stepId),
    }))
  }

  const createWorkflow = async () => {
    if (!workflow.name.trim()) {
      toast({
        title: "Error",
        description: "Workflow name is required",
        variant: "destructive",
      })
      return
    }

    if (workflow.workflow_steps.length === 0) {
      toast({
        title: "Error",
        description: "At least one workflow step is required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/orchestration/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) {
        throw new Error("Failed to create workflow")
      }

      const data = await response.json()

      toast({
        title: "Workflow Created",
        description: `${workflow.name} has been created successfully`,
      })

      // Reset form
      setWorkflow({
        name: "",
        description: "",
        trigger_type: "manual",
        trigger_config: {},
        workflow_steps: [],
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const executeWorkflow = async () => {
    if (workflow.workflow_steps.length === 0) {
      toast({
        title: "Error",
        description: "Cannot execute empty workflow",
        variant: "destructive",
      })
      return
    }

    // For demo purposes, create a temporary workflow and execute it
    try {
      const createResponse = await fetch("/api/orchestration/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workflow, name: workflow.name || "Test Workflow" }),
      })

      if (!createResponse.ok) throw new Error("Failed to create workflow")

      const { workflow: createdWorkflow } = await createResponse.json()

      const executeResponse = await fetch("/api/orchestration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: createdWorkflow.id,
          input_data: {},
        }),
      })

      if (!executeResponse.ok) throw new Error("Failed to execute workflow")

      const result = await executeResponse.json()

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

  const getStepIcon = (stepType: string) => {
    const stepTypeConfig = STEP_TYPES.find((type) => type.value === stepType)
    const IconComponent = stepTypeConfig?.icon || Settings
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Builder</CardTitle>
          <CardDescription>Create automated workflows that coordinate multiple AI agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              value={workflow.name}
              onChange={(e) => setWorkflow((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workflow name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workflow-description">Description</Label>
            <Textarea
              id="workflow-description"
              value={workflow.description}
              onChange={(e) => setWorkflow((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this workflow does"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trigger-type">Trigger Type</Label>
            <Select
              value={workflow.trigger_type}
              onValueChange={(value) => setWorkflow((prev) => ({ ...prev, trigger_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>Define the sequence of actions for your workflow</CardDescription>
            </div>
            <Button onClick={addStep} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workflow.workflow_steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No steps added yet. Click "Add Step" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {workflow.workflow_steps.map((step, index) => (
                <Card key={step.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Step {index + 1}</Badge>
                        {getStepIcon(step.type)}
                        <span className="font-medium">{step.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Step Name</Label>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          placeholder="Enter step name"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Step Type</Label>
                        <Select
                          value={step.type}
                          onValueChange={(value) => updateStep(step.id, { type: value, config: {} })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STEP_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Step-specific configuration */}
                      {step.type === "delay" && (
                        <div className="grid gap-2">
                          <Label>Delay (seconds)</Label>
                          <Input
                            type="number"
                            value={step.config.delay_seconds || 5}
                            onChange={(e) =>
                              updateStep(step.id, {
                                config: { ...step.config, delay_seconds: Number.parseInt(e.target.value) },
                              })
                            }
                            placeholder="5"
                          />
                        </div>
                      )}

                      {step.type === "conditional" && (
                        <div className="grid gap-2">
                          <Label>Condition</Label>
                          <Input
                            value={step.config.condition || ""}
                            onChange={(e) =>
                              updateStep(step.id, {
                                config: { ...step.config, condition: e.target.value },
                              })
                            }
                            placeholder="data.count > 0"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={createWorkflow} disabled={isCreating} className="flex-1">
          {isCreating ? "Creating..." : "Create Workflow"}
        </Button>
        <Button onClick={executeWorkflow} variant="outline">
          <Play className="h-4 w-4 mr-2" />
          Test Run
        </Button>
      </div>
    </div>
  )
}
