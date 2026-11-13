/* eslint-disable react/prop-types, no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  User,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  Loader2,
  Plus,
  X,
  Edit2,
  Trash2,
  Play,
  ClipboardList,
} from "lucide-react";

const API_URL = "http://localhost:8080/api/v1";

const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  const tenantId = localStorage.getItem("tenantId");
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }
  return headers;
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [aiResults, setAiResults] = useState({});
  const [analyzingId, setAnalyzingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedInspector, setSelectedInspector] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const userRole = localStorage.getItem("userRole");

  // New state variables for inspection execution
  const [isFindingsModalOpen, setIsFindingsModalOpen] = useState(false);
  const [selectedInspectionForFindings, setSelectedInspectionForFindings] = useState(null);
  const [inspectionFindings, setInspectionFindings] = useState([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [newFindingDescription, setNewFindingDescription] = useState("");
  const [newFindingSeverity, setNewFindingSeverity] = useState("MEDIUM");
  const [newFindingRequirementId, setNewFindingRequirementId] = useState("");
  const [submittingFinding, setSubmittingFinding] = useState(false);
  const [completingInspection, setCompletingInspection] = useState(false);

  const [allRequirements, setAllRequirements] = useState([]);
  const [allRegulations, setAllRegulations] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError("");
    try {
      const [inspRes, orgRes, reqRes, regRes] = await Promise.all([
        fetch(`${API_URL}/inspections?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/organizations?size=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/requirements?size=200`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/regulations?size=200`, { headers: getAuthHeaders() })
      ]);
      if (!inspRes.ok) throw new Error(`Inspections API: ${inspRes.status}`);
      if (!orgRes.ok) throw new Error(`Organizations API: ${orgRes.status}`);
      const inspData = await inspRes.json();
      const orgData = await orgRes.json();
      let reqData, regData;
      try { reqData = await reqRes.json(); } catch (e) { reqData = { success: false, data: [] }; }
      try { regData = await regRes.json(); } catch (e) { regData = { success: false, data: [] }; }

      if (inspData.success) setInspections(inspData.data.content || inspData.data);
      if (orgData.success) setOrganizations(orgData.data.content || orgData.data);
      setAllRequirements(reqData.data?.content || reqData.data || []);
      setAllRegulations(regData.data?.content || regData.data || []);

      if (userRole === "ADMIN" || userRole === "AUDITOR") {
        const userRes = await fetch(`${API_URL}/users?size=100&role=AUDITOR`, {
          headers: getAuthHeaders(),
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.success)
            setInspectors(userData.data.content || userData.data);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: "bg-blue-100 text-blue-700",
      IN_PROGRESS: "bg-amber-100 text-amber-700",
      COMPLETED: "bg-green-100 text-green-700",
      CLOSED: "bg-gray-100 text-gray-600",
    };
    return colors[status] || colors.SCHEDULED;
  };

  const stats = {
    total: inspections.length,
    scheduled: inspections.filter((i) => i.status === "SCHEDULED").length,
    completed: inspections.filter((i) => i.status === "COMPLETED").length,
    inProgress: inspections.filter((i) => i.status === "IN_PROGRESS").length,
  };

  const handleAIGenerate = async (id) => {
    setAnalyzingId(id);
    try {
      const response = await fetch(`${API_URL}/inspections/${id}/ai-analysis`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setAiResults((prev) => ({
          ...prev,
          [id]: data.data || "Analysis generated",
        }));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleEdit = (inspection) => {
    setEditingId(inspection.id);
    setSelectedOrg(inspection.organizationId || "");
    setSelectedInspector(inspection.inspectorId || "");
    setScheduledDate(inspection.scheduledDate?.slice(0, 10) || "");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    try {
      const res = await fetch(`${API_URL}/inspections/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !scheduledDate) return;
    try {
      const userId = localStorage.getItem("userId");
      const requestBody = {
        organizationId: selectedOrg,
        scheduledDate: scheduledDate,
      };
      if (selectedInspector) {
        requestBody.inspectorId = selectedInspector;
      }
      const url = editingId
        ? `${API_URL}/inspections/${editingId}`
        : `${API_URL}/inspections?userId=${userId}`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingId(null);
        setSelectedOrg("");
        setSelectedInspector("");
        setScheduledDate("");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleStartInspection = async (id) => {
    try {
      const res = await fetch(`${API_URL}/inspections/${id}/status?status=IN_PROGRESS`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Error starting inspection:", error);
    }
  };

  const fetchInspectionFindings = async (id) => {
    setLoadingFindings(true);
    try {
      const res = await fetch(`${API_URL}/inspections/${id}/findings`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setInspectionFindings(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching findings:", error);
    } finally {
      setLoadingFindings(false);
    }
  };

  const handleAddFinding = async (id) => {
    if (!newFindingDescription.trim() || !newFindingRequirementId) return;
    setSubmittingFinding(true);
    try {
      const res = await fetch(`${API_URL}/inspections/${id}/findings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: newFindingDescription,
          severity: newFindingSeverity,
          requirementId: newFindingRequirementId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewFindingDescription("");
        setNewFindingSeverity("MEDIUM");
        setNewFindingRequirementId("");
        fetchInspectionFindings(id);
      }
    } catch (error) {
      console.error("Error adding finding:", error);
    } finally {
      setSubmittingFinding(false);
    }
  };

  const handleCompleteInspection = async (id) => {
    setCompletingInspection(true);
    try {
      const res = await fetch(`${API_URL}/inspections/${id}/status?status=COMPLETED`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setIsFindingsModalOpen(false);
        setSelectedInspectionForFindings(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error completing inspection:", error);
    } finally {
      setCompletingInspection(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#005387]" />
      </div>
    );
  }

  const sortByDate = (a, b) => {
    const dateA = a.scheduledDate ? new Date(a.scheduledDate) : new Date(0);
    const dateB = b.scheduledDate ? new Date(b.scheduledDate) : new Date(0);
    return dateB - dateA;
  };

  const scheduled = inspections.filter((i) => i.status === "SCHEDULED");
  const inProgress = inspections.filter((i) => i.status === "IN_PROGRESS");
  const completed = inspections.filter((i) => i.status === "COMPLETED");
  const closed = inspections.filter((i) => i.status === "CLOSED");

  const filterFn = (i) =>
    (i.organizationName || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (i.inspectorName || "").toLowerCase().includes(searchTerm.toLowerCase());

  const filteredScheduled = scheduled.filter(filterFn).sort(sortByDate);
  const filteredInProgress = inProgress.filter(filterFn).sort(sortByDate);
  const filteredCompleted = completed.filter(filterFn).sort(sortByDate);
  const filteredClosed = closed.filter(filterFn).sort(sortByDate);

  const InspectionTable = ({ items, icon: Icon, title, emptyMsg }) => (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
        <Icon className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          {emptyMsg}
        </div>
      ) : (
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Inspector
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((inspection) => (
                <React.Fragment key={inspection.id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <MapPin className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {inspection.organizationName || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inspection.inspectorName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {inspection.scheduledDate?.slice(0, 10) || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(inspection.status)}`}
                      >
                        {inspection.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(userRole === "ADMIN" || userRole === "AUDITOR") && 
                         inspection.status === "SCHEDULED" && 
                         inspection.scheduledDate?.slice(0, 10) === new Date().toISOString().split('T')[0] && (
                          <button
                            onClick={() => handleStartInspection(inspection.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005387] text-white text-xs font-medium rounded-lg hover:bg-[#004570] transition-colors"
                          >
                            <Play className="h-3 w-3" />
                            Start
                          </button>
                        )}
                        {(userRole === "ADMIN" || userRole === "AUDITOR") && inspection.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => {
                              setSelectedInspectionForFindings(inspection);
                              setInspectionFindings([]);
                              setNewFindingDescription("");
                              setNewFindingSeverity("MEDIUM");
                              setIsFindingsModalOpen(true);
                              fetchInspectionFindings(inspection.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            <ClipboardList className="h-3 w-3" />
                            Findings
                          </button>
                        )}
                        {(userRole === "ADMIN" || userRole === "AUDITOR") && inspection.status !== "COMPLETED" && inspection.status !== "CLOSED" && (
                          <>
                            <button
                              onClick={() => handleEdit(inspection)}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-500"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(inspection.id)}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleAIGenerate(inspection.id)}
                          disabled={analyzingId === inspection.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          {analyzingId === inspection.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-[#005387]" />
                          )}
                          AI
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aiResults[inspection.id] && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-blue-100 bg-blue-50/50 px-6 py-4"
                      >
                        <div className="max-w-3xl">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              AI Analysis
                            </span>
                          </div>
                          <div className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                            {(() => {
                              const lines =
                                aiResults[inspection.id].split("\n");
                              const elements = [];
                              for (let i = 0; i < lines.length; i++) {
                                const line = lines[i].trim();
                                if (!line) {
                                  elements.push(
                                    <div key={i} className="h-2" />,
                                  );
                                } else if (line.startsWith("-")) {
                                  elements.push(
                                    <div
                                      key={i}
                                      className="ml-2 flex items-start gap-2"
                                    >
                                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 text-blue-500" />
                                      <span>{line.substring(1).trim()}</span>
                                    </div>,
                                  );
                                } else if (line.endsWith(":")) {
                                  elements.push(
                                    <div
                                      key={i}
                                      className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-800 first:mt-0"
                                    >
                                      {line}
                                    </div>,
                                  );
                                } else if (
                                  line.startsWith("Overall Assessment:")
                                ) {
                                  const assessment = line
                                    .substring("Overall Assessment:".length)
                                    .trim();
                                  let color = "text-gray-700";
                                  if (assessment.includes("COMPLIANT"))
                                    color = "text-green-700";
                                  else if (assessment.includes("NON_COMPLIANT"))
                                    color = "text-red-700";
                                  else if (assessment.includes("PARTIALLY"))
                                    color = "text-amber-700";
                                  else if (
                                    assessment.includes("PENDING") ||
                                    assessment.includes("INCONCLUSIVE")
                                  )
                                    color = "text-blue-700";
                                  elements.push(
                                    <div
                                      key={i}
                                      className="mt-2 flex items-center gap-2 border-t border-blue-200 pt-2"
                                    >
                                      <span className="font-semibold text-gray-800">
                                        Overall Assessment:
                                      </span>
                                      <span
                                        className={`font-semibold ${color}`}
                                      >
                                        {assessment}
                                      </span>
                                    </div>,
                                  );
                                } else if (
                                  line.startsWith("Status:") ||
                                  line.startsWith("Scheduled Date:") ||
                                  line.startsWith("Assigned Inspector:")
                                ) {
                                  const [label, ...rest] = line.split(":");
                                  elements.push(
                                    <div
                                      key={i}
                                      className="flex items-baseline gap-2"
                                    >
                                      <span className="min-w-[120px] font-medium text-gray-600">
                                        {label}:
                                      </span>
                                      <span>
                                        {rest
                                          .join(":")
                                          .trim()
                                          .replace("T00:00", "")}
                                      </span>
                                    </div>,
                                  );
                                } else {
                                  elements.push(<div key={i}>{line}</div>);
                                }
                              }
                              return elements;
                            })()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inspections</h1>
          <p className="mt-1 text-sm font-light text-gray-500">
            Schedule and manage inspections
          </p>
        </div>
        {(userRole === "ADMIN" || userRole === "AUDITOR") && (
          <button
            onClick={() => {
              setEditingId(null);
              setSelectedOrg("");
              setSelectedInspector("");
              setScheduledDate("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#005387] px-4 py-2.5 font-medium text-white hover:bg-[#004570]"
          >
            <Plus className="h-4 w-4" />
            Schedule
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 font-light">Total Inspections</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.scheduled}</p>
              <p className="text-xs text-gray-500 font-light">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.inProgress}</p>
              <p className="text-xs text-gray-500 font-light">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.completed}</p>
              <p className="text-xs text-gray-500 font-light">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => {
              setError("");
              fetchData();
            }}
            className="ml-auto text-xs text-red-500 underline hover:text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#005387]/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm"
        >
          <option value="all">All Status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="space-y-6">
        {(filter === "all" || filter === "SCHEDULED") &&
          (filteredScheduled.length > 0 || filter !== "all") && (
            <InspectionTable
              items={filteredScheduled}
              icon={Calendar}
              title="Scheduled Inspections"
              emptyMsg="No scheduled inspections"
            />
          )}
        {(filter === "all" || filter === "IN_PROGRESS") &&
          (filteredInProgress.length > 0 || filter !== "all") && (
            <InspectionTable
              items={filteredInProgress}
              icon={Clock}
              title="In Progress Inspections"
              emptyMsg="No in-progress inspections"
            />
          )}
        {(filter === "all" || filter === "COMPLETED") &&
          (filteredCompleted.length > 0 || filter !== "all") && (
            <InspectionTable
              items={filteredCompleted}
              icon={CheckCircle}
              title="Completed Inspections"
              emptyMsg="No completed inspections"
            />
          )}
        {(filter === "all" || filter === "CLOSED") &&
          (filteredClosed.length > 0 || filter !== "all") && (
            <InspectionTable
              items={filteredClosed}
              icon={XCircle}
              title="Closed Inspections"
              emptyMsg="No closed inspections"
            />
          )}

        {filteredScheduled.length === 0 &&
          filteredInProgress.length === 0 &&
          filteredCompleted.length === 0 &&
          filteredClosed.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              No inspections found.
            </div>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Inspection" : "Schedule Inspection"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Organization
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#005387]/20"
                >
                  <option value="">Select organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {userRole === "ADMIN" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Assign Inspector
                  </label>
                  <select
                    value={selectedInspector}
                    onChange={(e) => setSelectedInspector(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#005387]/20"
                  >
                    <option value="">Select inspector...</option>
                    {inspectors.map((insp) => (
                      <option key={insp.id} value={insp.id}>
                        {insp.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#005387]/20"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#005387] py-3 font-medium text-white hover:bg-[#004570]"
              >
                Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Findings Modal */}
      {isFindingsModalOpen && selectedInspectionForFindings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Document Inspection Findings</h3>
                <p className="text-xs text-gray-500 font-light mt-0.5">{selectedInspectionForFindings.organizationName}</p>
              </div>
              <button
                onClick={() => {
                  setIsFindingsModalOpen(false);
                  setSelectedInspectionForFindings(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* List of current findings */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                  Findings Added ({inspectionFindings.length})
                </h4>
                {loadingFindings ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-[#005387]" />
                  </div>
                ) : inspectionFindings.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                    {inspectionFindings.map((finding) => (
                      <div key={finding.id} className="flex items-start justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-soft">
                        <div className="flex-1">
                          <p className="text-xs text-gray-700 font-normal leading-relaxed">{finding.description}</p>
                          {finding.requirementTitle && (
                            <p className="text-[10px] text-gray-500 mt-1 italic">Violates: {finding.requirementTitle}</p>
                          )}
                          <div className="flex items-center gap-2.5 mt-2">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              finding.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              finding.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              finding.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {finding.severity}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400 shrink-0" />
                              Inspector: <strong className="text-gray-700 font-semibold">{finding.createdByName || selectedInspectionForFindings?.inspectorName || "Auditor"}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                    <p className="text-xs text-gray-400">No findings documented yet for this inspection.</p>
                  </div>
                )}
              </div>

              {/* Form to add a new finding */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Record New Finding
                </h4>
                <div>
                  <label className="block text-xs text-gray-500 font-medium mb-1.5">Finding / Violation Description</label>
                  <textarea
                    rows={3}
                    value={newFindingDescription}
                    onChange={(e) => setNewFindingDescription(e.target.value)}
                    placeholder="Describe details of the observation or violation found during the site visit..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 font-medium mb-1.5">Violated Requirement</label>
                    <select
                      value={newFindingRequirementId}
                      onChange={(e) => setNewFindingRequirementId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm bg-white"
                    >
                      <option value="">Select requirement...</option>
                      {(() => {
                        const org = organizations.find(o => o.id === selectedInspectionForFindings?.organizationId);
                        if (!org || !org.sector) return null;
                        const sectorLower = org.sector.trim().toLowerCase();
                        const regIds = new Set(allRegulations.filter(r => r.sector?.trim().toLowerCase() === sectorLower).map(r => r.id));
                        const applicableReqs = allRequirements.filter(req => req.regulationId && regIds.has(req.regulationId));
                        return applicableReqs.map(req => (
                          <option key={req.id} value={req.id}>{req.title}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1.5">Severity Level</label>
                    <select
                      value={newFindingSeverity}
                      onChange={(e) => setNewFindingSeverity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm bg-white"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFinding(selectedInspectionForFindings.id)}
                    disabled={submittingFinding || !newFindingDescription.trim() || !newFindingRequirementId}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#005387] text-white text-xs font-semibold rounded-xl hover:bg-[#004570] disabled:opacity-50 transition-colors"
                  >
                    {submittingFinding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Record Finding
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFindingsModalOpen(false);
                  setSelectedInspectionForFindings(null);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleCompleteInspection(selectedInspectionForFindings.id)}
                disabled={completingInspection}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {completingInspection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Complete & Submit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
