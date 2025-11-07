"use client";

import { useState, useEffect } from "react";
import { Camera } from "@/types/camera";
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

interface CommandHistoryProps {
  cameraId: string;
}

interface Command {
  id: string;
  command_type: string;
  command_payload: any;
  status: "pending" | "in_progress" | "completed" | "failed";
  response: any;
  created_at: string;
  completed_at?: string;
}

export default function CommandHistory({ cameraId }: CommandHistoryProps) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommands = async () => {
    try {
      const response = await fetch(`/api/cameras/${cameraId}/command-history`);
      if (response.ok) {
        const data = await response.json();
        setCommands(data.commands || []);
      }
    } catch (error) {
      console.error("Failed to fetch command history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();

    // Refresh every 5 seconds
    const interval = setInterval(fetchCommands, 5000);
    return () => clearInterval(interval);
  }, [cameraId]);

  const getStatusIcon = (status: Command["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-zinc-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: Command["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500 bg-green-500/10";
      case "failed":
        return "text-red-500 bg-red-500/10";
      case "in_progress":
        return "text-yellow-500 bg-yellow-500/10";
      case "pending":
        return "text-zinc-500 bg-zinc-500/10";
      default:
        return "text-zinc-500 bg-zinc-500/10";
    }
  };

  const formatCommandType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Command History</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Command History</h3>
        <button
          onClick={fetchCommands}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <Clock className="h-3 w-3" />
        </button>
      </div>

      {commands.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-zinc-500">No commands sent yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {commands.map((command) => (
            <div
              key={command.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(command.status)}
                    <span className="text-sm font-medium text-white">
                      {formatCommandType(command.command_type)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${getStatusColor(command.status)}`}>
                      {command.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {formatTime(command.created_at)}
                    </span>
                  </div>

                  {command.response && command.status === "completed" && (
                    <div className="mt-2 rounded bg-zinc-800/50 p-2">
                      <pre className="text-[9px] text-zinc-400 overflow-x-auto">
                        {JSON.stringify(command.response, null, 2)}
                      </pre>
                    </div>
                  )}

                  {command.response && command.status === "failed" && (
                    <div className="mt-2 rounded bg-red-500/10 p-2">
                      <p className="text-[10px] text-red-400">
                        {command.response.error || "Command failed"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
