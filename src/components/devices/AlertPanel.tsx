"use client";

import { useState, useEffect } from "react";
import { DeviceAlert } from "@/types";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

type AlertPanelProps = {
  deviceId?: string;
};

export const AlertPanel = ({ deviceId }: AlertPanelProps) => {
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved">("unresolved");
  const toast = useToast();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (deviceId) params.append("device_id", deviceId);
      if (filter === "unresolved") params.append("is_resolved", "false");

      const response = await fetch(`/api/devices/alerts?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAlerts(data.alerts || []);
      } else {
        toast.error("Failed to load alerts");
      }
    } catch (error) {
      toast.error("Error loading alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [deviceId, filter]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch("/api/devices/alerts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_id: alertId,
          is_resolved: true,
        }),
      });

      if (response.ok) {
        toast.success("Alert resolved");
        // Remove the alert from the list
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      } else {
        toast.error("Failed to resolve alert");
      }
    } catch (error) {
      toast.error("Error resolving alert");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-400" />;
      default:
        return <Info className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "info":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_battery: "Low Battery",
      offline: "Device Offline",
      temperature: "Temperature Alert",
      signal_loss: "Signal Loss",
      geofence: "Geofence Violation",
      custom: "Custom Alert",
    };
    return labels[type] || type;
  };

  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-brand-cherry" />
          <span className="text-sm text-zinc-400">Loading alerts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Device Alerts</h3>
          {unresolvedCount > 0 && (
            <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
              {unresolvedCount} unresolved
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter("unresolved")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "unresolved"
                ? "bg-brand-cherry text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "bg-brand-cherry text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400 mb-3" />
          <p className="text-sm text-zinc-400">
            {filter === "unresolved" ? "No unresolved alerts" : "No alerts found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${getSeverityStyles(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!alert.is_resolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300">{alert.message}</p>
                  {alert.is_resolved && alert.resolved_at && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Resolved: {new Date(alert.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
