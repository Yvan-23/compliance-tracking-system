/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Lock,
  Loader2,
  X,
  AlertCircle,
  Send,
  Sparkles,
  ThumbsDown,
  ClipboardList,
  RotateCw,
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

async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [generatedHash, setGeneratedHash] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState("");
  const [comment, setComment] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmission, setReviewSubmission] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSubmission, setDetailsSubmission] = useState(null);
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");
  const canReview = userRole !== "ENTITY";
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("all");

  useEffect(() => {
    fetchData();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_URL}/organizations?size=200`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrganizations(data.data.content || data.data);
      }
    } catch (e) {
      console.error("Error fetching organizations:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userRole = localStorage.getItem("userRole");
      const orgId = localStorage.getItem("organizationId");

      const [recRes, reqRes, subRes] = await Promise.all([
        fetch(`${API_URL}/compliance/records?size=100`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/requirements?size=100`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/submissions?size=100`, { headers: getAuthHeaders() }),
      ]);

      const recData = await recRes.json();
      const reqData = await reqRes.json();
      const subData = await subRes.json();

      if (subData.success) setSubmissions(subData.data?.content || []);

      let records = recData.data?.content || recData.data || [];
      let allReqs = reqData.data?.content || reqData.data || [];

      // Filter by sector for ENTITY users
      if (userRole === "ENTITY" && orgId) {
        try {
          const orgRes = await fetch(`${API_URL}/organizations/${orgId}`, {
            headers: getAuthHeaders(),
          });
          const orgData = await orgRes.json();
          if (orgData.success && orgData.data?.sector) {
            const orgSector = orgData.data.sector;
            const regRes2 = await fetch(`${API_URL}/regulations`, {
              headers: getAuthHeaders(),
            });
            const regData2 = await regRes2.json();
            const allRegs = regData2.data?.content || regData2.data || [];
            const sectorRegIds = allRegs
              .filter((r) => r.sector === orgSector)
              .map((r) => r.id);
            allReqs = allReqs.filter(
              (req) =>
                req.regulationId && sectorRegIds.includes(req.regulationId),
            );
          }
        } catch (e) {
          console.warn("Could not filter by sector:", e);
        }
      }

      setRequirements(allReqs.length > 0 ? allReqs : records);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const orgFiltered =
    selectedOrgId === "all"
      ? submissions
      : submissions.filter(
          (s) =>
            String(s.organizationId) === selectedOrgId ||
            s.organizationId?.toString() === selectedOrgId,
        );

  const sortByDate = (a, b) => {
    const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);
    const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);
    return dateB - dateA;
  };

  const approved = orgFiltered.filter((s) => s.status === "APPROVED");
  const pending = orgFiltered.filter((s) => s.status === "SUBMITTED");
  const drafts = orgFiltered.filter((s) => s.status === "DRAFT");
  const rejected = orgFiltered.filter((s) => s.status === "REJECTED");

  const filterFn = (s) =>
    (s.complianceRecordTitle || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (s.organizationName || "").toLowerCase().includes(searchTerm.toLowerCase());

  const filteredApproved = approved.filter(filterFn).sort(sortByDate);
  const filteredPending = pending.filter(filterFn).sort(sortByDate);
  const filteredDrafts = drafts.filter(filterFn).sort(sortByDate);
  const filteredRejected = rejected.filter(filterFn).sort(sortByDate);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress("Computing SHA-256 hash...");
      try {
        const hash = await computeSHA256(file);
        setGeneratedHash(hash);
        setUploadProgress(`File encrypted. SHA-256: ${hash.slice(0, 16)}...`);
      } catch (error) {
        console.error("Hash error:", error);
        setUploadProgress("Hash computation failed");
      }
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedReq) return;

    setUploading(true);
    const organizationId = localStorage.getItem("organizationId");

    try {
      let complianceRecordId = selectedReq;
      if (organizationId) {
        setUploadProgress("Ensuring compliance record...");
        const ensureRes = await fetch(
          `${API_URL}/compliance/ensure-record?organizationId=${organizationId}&requirementId=${selectedReq}`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          },
        );
        const ensureData = await ensureRes.json();
        if (ensureData.success) {
          complianceRecordId = ensureData.data;
        }
      }

      setUploadProgress("Creating draft submission...");
      const draftRes = await fetch(
        `${API_URL}/submissions/draft?userId=${userId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            complianceRecordId: complianceRecordId,
            initialComment: comment || "Submission for compliance",
          }),
        },
      );
      const draftData = await draftRes.json();

      if (!draftData.success) throw new Error(draftData.message);

      const submissionId = draftData.data.id;
      setUploadProgress("Uploading evidence file...");

      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await fetch(
        `${API_URL}/submissions/${submissionId}/upload?userId=${userId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        },
      );
      if (!uploadRes.ok) throw new Error("File upload failed");

      setUploadProgress("Submitting compliance report...");
      const submitRes = await fetch(
        `${API_URL}/submissions/${submissionId}/submit?userId=${userId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      if (!submitRes.ok) throw new Error("Submission failed");

      setUploadProgress(
        "Submission complete! File integrity secured with SHA-256 encryption.",
      );
      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setSelectedReq("");
        setComment("");
        setGeneratedHash(null);
        setUploadProgress("");
        fetchData();
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const [reanalyzing, setReanalyzing] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReanalyze = async (sub) => {
    setReanalyzing(sub.id);
    try {
      const res = await fetch(`${API_URL}/submissions/${sub.id}/reanalyze`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Re-analyze error:", error);
    } finally {
      setReanalyzing(null);
    }
  };

  const openReview = (sub) => {
    setReviewSubmission(sub);
    setReviewComment("");
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!reviewSubmission) return;
    setReviewLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/submissions/${reviewSubmission.id}/approve?userId=${userId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ comment: reviewComment }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setShowReviewModal(false);
        setReviewSubmission(null);
        setReviewComment("");
        showNotification("Submission approved successfully", "success");
        fetchData();
      } else {
        showNotification(
          data.message || "Failed to approve submission",
          "error",
        );
      }
    } catch (error) {
      console.error("Approve error:", error);
      showNotification("Failed to approve submission", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewSubmission) return;
    setReviewLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/submissions/${reviewSubmission.id}/reject?userId=${userId}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ comment: reviewComment }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setShowReviewModal(false);
        setReviewSubmission(null);
        setReviewComment("");
        showNotification("Submission rejected", "success");
        fetchData();
      } else {
        showNotification(
          data.message || "Failed to reject submission",
          "error",
        );
      }
    } catch (error) {
      console.error("Reject error:", error);
      showNotification("Failed to reject submission", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const SubmissionTable = ({ items, icon: Icon, title, emptyMsg }) => (
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
                  Requirement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Submitted By
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  AI Analysis
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
              {items.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sub.complianceRecordTitle ||
                            sub.complianceRecordId?.slice(0, 8) ||
                            "No requirement"}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {sub.id?.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.organizationName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.submittedByName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {sub.submissionDate?.slice(0, 10) || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {sub.aiAnalysisStatus &&
                    sub.aiAnalysisStatus !== "AI_SKIPPED" ? (
                      userRole === "ENTITY" ? (
                        <span
                          title={sub.documentSummary || "AI Document Pre-Check"}
                          className={`inline-flex cursor-default items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                            sub.aiAnalysisStatus === "AUTO_APPROVED" ||
                            sub.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                              ? "border border-green-200 bg-green-50 text-green-700"
                              : sub.aiAnalysisStatus === "AUTO_REJECTED" ||
                                  sub.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                                ? "border border-amber-200 bg-amber-50 text-amber-700"
                                : "border border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {sub.aiAnalysisStatus === "AUTO_APPROVED" ||
                          sub.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                            ? "Pre-Check Passed"
                            : sub.aiAnalysisStatus === "AUTO_REJECTED" ||
                                sub.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                              ? "Attention Suggested"
                              : "Pre-Check Pending"}
                        </span>
                      ) : (
                        <span
                          title={sub.aiAnalysisDetails || sub.aiAnalysisStatus}
                          className={`inline-flex cursor-default items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                            sub.aiAnalysisStatus === "AUTO_APPROVED" ||
                            sub.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                              ? "border border-green-200 bg-green-50 text-green-700"
                              : sub.aiAnalysisStatus === "AUTO_REJECTED" ||
                                  sub.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                                ? "border border-red-200 bg-red-50 text-red-700"
                                : sub.aiAnalysisStatus === "PENDING_REVIEW"
                                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                                  : sub.aiAnalysisStatus === "AI_ERROR"
                                    ? "border border-orange-200 bg-orange-50 text-orange-700"
                                    : "border border-gray-200 bg-gray-50 text-gray-500"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {sub.aiAnalysisStatus === "AUTO_APPROVED"
                            ? "Auto Approved"
                            : sub.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                              ? "AI Suggests Approval"
                              : sub.aiAnalysisStatus === "AUTO_REJECTED"
                                ? "Auto Rejected"
                                : sub.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                                  ? "AI Suggests Rejection"
                                  : sub.aiAnalysisStatus === "PENDING_REVIEW"
                                    ? "Pending Review"
                                    : sub.aiAnalysisStatus === "AI_ERROR"
                                      ? "AI Error"
                                      : sub.aiAnalysisStatus}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                        sub.status === "APPROVED"
                          ? "border border-green-200 bg-green-50 text-green-700"
                          : sub.status === "REJECTED"
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : sub.status === "SUBMITTED"
                              ? "border border-blue-200 bg-blue-50 text-blue-700"
                              : sub.status === "DRAFT"
                                ? "border border-gray-200 bg-gray-50 text-gray-600"
                                : "border border-gray-200 bg-gray-50 text-gray-500"
                      }`}
                    >
                      {sub.status === "APPROVED" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : sub.status === "REJECTED" ? (
                        <XCircle className="h-3 w-3" />
                      ) : sub.status === "SUBMITTED" ? (
                        <Clock className="h-3 w-3" />
                      ) : sub.status === "DRAFT" ? (
                        <FileText className="h-3 w-3" />
                      ) : null}
                      <span className="capitalize">
                        {(sub.status || "").toLowerCase()}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canReview &&
                      (sub.aiAnalysisStatus === "PENDING_REVIEW" ||
                        sub.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL" ||
                        sub.aiAnalysisStatus === "AI_SUGGESTS_REJECTION") &&
                      title === "Pending" ? (
                        <button
                          onClick={() => openReview(sub)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDetailsSubmission(sub);
                            setShowDetailsModal(true);
                          }}
                          className="rounded-lg p-1.5 hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                      {sub.evidenceUrl && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `${API_URL}/submissions/${sub.id}/download`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                                  },
                                },
                              );
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = sub.id + ".pdf";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error("Download error:", e);
                            }
                          }}
                          className="rounded-lg p-1.5 hover:bg-gray-100"
                        >
                          <Download className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                      {sub.evidenceUrl && (
                        <button
                          onClick={() => handleReanalyze(sub)}
                          disabled={reanalyzing === sub.id}
                          className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-50"
                          title="Re-analyze with OCR + AI"
                        >
                          <RotateCw
                            className={`h-4 w-4 text-gray-400 ${reanalyzing === sub.id ? "animate-spin" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-8">
      {notification && (
        <div
          className={`fixed right-6 top-6 z-[100] rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-all ${
            notification.type === "success"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {notification.message}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Submissions</h1>
          <p className="mt-1 text-sm font-light text-gray-500">
            Manage compliance report submissions
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          New Submission
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
          <p className="text-2xl font-semibold text-gray-900">
            {approved.length}
          </p>
          <p className="text-xs font-light text-gray-500">Approved</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
          <p className="text-2xl font-semibold text-gray-900">
            {pending.length}
          </p>
          <p className="text-xs font-light text-gray-500">Pending</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
          <p className="text-2xl font-semibold text-gray-900">
            {drafts.length}
          </p>
          <p className="text-xs font-light text-gray-500">Drafts</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
          <p className="text-2xl font-semibold text-red-600">
            {rejected.length}
          </p>
          <p className="text-xs font-light text-gray-500">Rejected</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by requirement or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="min-w-[180px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none"
        >
          <option value="all">All Organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {filteredApproved.length > 0 && (
        <SubmissionTable
          items={filteredApproved}
          icon={CheckCircle}
          title="Approved"
          emptyMsg="No approved submissions"
        />
      )}
      {filteredPending.length > 0 && (
        <SubmissionTable
          items={filteredPending}
          icon={Send}
          title="Pending"
          emptyMsg="No pending submissions"
        />
      )}
      {filteredDrafts.length > 0 && (
        <SubmissionTable
          items={filteredDrafts}
          icon={Clock}
          title="Drafts"
          emptyMsg="No draft submissions"
        />
      )}

      {filteredRejected.length > 0 && (
        <SubmissionTable
          items={filteredRejected}
          icon={ThumbsDown}
          title="Rejected"
          emptyMsg="No rejected submissions"
        />
      )}

      {filteredApproved.length === 0 &&
        filteredPending.length === 0 &&
        filteredDrafts.length === 0 &&
        filteredRejected.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            No submissions found.
          </div>
        )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Evidence
                </h2>
                <p className="mt-0.5 text-sm font-light text-gray-500">
                  File integrity protected with SHA-256
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setSelectedReq("");
                  setComment("");
                  setGeneratedHash(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Requirement
                </label>
                {requirements.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    Loading requirements...
                  </div>
                ) : (
                  <select
                    value={selectedReq}
                    onChange={(e) => setSelectedReq(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Select...</option>
                    {requirements.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.requirementTitle || req.title || req.id}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Add a comment..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Upload File
                </label>
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors hover:border-primary-500">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText className="mx-auto h-8 w-8 text-primary-500" />
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {generatedHash && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-600" />
                    <code className="truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      SHA-256: {generatedHash.slice(0, 20)}...
                    </code>
                  </div>
                </div>
              )}

              {uploadProgress && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    {uploading && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    )}
                    <p className="text-sm text-gray-600">{uploadProgress}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile || !selectedReq}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && reviewSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Review Submission
                </h2>
                <p className="mt-0.5 text-sm font-light text-gray-500">
                  {reviewSubmission.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                    ? "AI recommends approval — please verify"
                    : reviewSubmission.aiAnalysisStatus ===
                        "AI_SUGGESTS_REJECTION"
                      ? "AI recommends rejection — please verify"
                      : "AI recommends manual review"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewSubmission(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">
                    AI Analysis Results
                  </span>
                </div>
                {/^Extracted: /.test(
                  reviewSubmission.aiAnalysisDetails || "",
                ) ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {[
                      "company",
                      "expiry",
                      "complianceStatus",
                      "docType",
                      "docNumber",
                      "authority",
                      "issueDate",
                      "personName",
                    ].map((key) => {
                      const match = reviewSubmission.aiAnalysisDetails.match(
                        new RegExp(key + "=([^,]+)"),
                      );
                      if (!match || match[1] === "null") return null;
                      const label =
                        key === "complianceStatus"
                          ? "Compliance"
                          : key === "docType"
                            ? "Doc Type"
                            : key === "docNumber"
                              ? "Doc Number"
                              : key === "personName"
                                ? "Person"
                                : key === "issueDate"
                                  ? "Issue Date"
                                  : key === "authority"
                                    ? "Authority"
                                    : key.charAt(0).toUpperCase() +
                                      key.slice(1);
                      return (
                        <div key={key} className="contents">
                          <span className="font-medium text-amber-600">
                            {label}
                          </span>
                          <span className="text-amber-800">{match[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-xs text-amber-700">
                    {reviewSubmission.aiAnalysisDetails ||
                      "No AI analysis details available."}
                  </p>
                )}
                {reviewSubmission.documentSummary && (
                  <div className="mt-2 border-t border-amber-200/60 pt-2">
                    <p className="mb-1 text-xs font-semibold text-amber-800">
                      Document Summary
                    </p>
                    <p className="text-xs leading-relaxed text-amber-700">
                      {reviewSubmission.documentSummary}
                    </p>
                  </div>
                )}
                {reviewSubmission.aiScore != null && (
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <span className="font-medium">Confidence Score:</span>
                    <span>{(reviewSubmission.aiScore * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm text-gray-500">Requirement</p>
                <p className="text-sm font-medium text-gray-900">
                  {reviewSubmission.complianceRecordTitle || "N/A"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Review Comment
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Add your review comment..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {canReview && (
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={reviewLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {reviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={reviewLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    {reviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && detailsSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Submission Details
                </h2>
                <p className="mt-0.5 text-sm font-light text-gray-500">
                  ID: {detailsSubmission.id?.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsSubmission(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Requirement
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {detailsSubmission.complianceRecordTitle || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Organization
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {detailsSubmission.organizationName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                      detailsSubmission.status === "APPROVED"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : detailsSubmission.status === "REJECTED"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : detailsSubmission.status === "SUBMITTED"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : detailsSubmission.status === "DRAFT"
                              ? "border-gray-200 bg-gray-50 text-gray-600"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {detailsSubmission.status === "APPROVED" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : detailsSubmission.status === "REJECTED" ? (
                      <XCircle className="h-3 w-3" />
                    ) : detailsSubmission.status === "SUBMITTED" ? (
                      <Clock className="h-3 w-3" />
                    ) : detailsSubmission.status === "DRAFT" ? (
                      <FileText className="h-3 w-3" />
                    ) : null}
                    <span className="capitalize">
                      {(detailsSubmission.status || "").toLowerCase()}
                    </span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {detailsSubmission.submissionDate?.slice(0, 10) || "N/A"}
                  </p>
                </div>
              </div>

              {detailsSubmission.aiAnalysisStatus && (
                userRole === "ENTITY" ? (
                  <div
                    className={`rounded-xl border p-4 ${
                      detailsSubmission.aiAnalysisStatus === "AUTO_APPROVED" ||
                      detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                        ? "border-green-200 bg-green-50/70"
                        : detailsSubmission.aiAnalysisStatus === "AUTO_REJECTED" ||
                            detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-blue-200 bg-blue-50/70"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-semibold text-gray-800">
                          AI Document Pre-Check
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          detailsSubmission.aiAnalysisStatus === "AUTO_APPROVED" ||
                          detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                            ? "bg-green-100 text-green-800"
                            : detailsSubmission.aiAnalysisStatus === "AUTO_REJECTED" ||
                                detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {detailsSubmission.aiAnalysisStatus === "AUTO_APPROVED" ||
                        detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                          ? "Pre-Check Passed"
                          : detailsSubmission.aiAnalysisStatus === "AUTO_REJECTED" ||
                              detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                            ? "Verification Notice"
                            : "Under Pre-Check"}
                      </span>
                    </div>

                    <p className="mb-3 text-xs leading-relaxed text-gray-700">
                      {detailsSubmission.aiAnalysisStatus === "AUTO_REJECTED" ||
                      detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_REJECTION"
                        ? "The automated document pre-check detected potential discrepancies in document parameters (such as validity dates or license fields). Official verification will be performed by a RURA Auditor."
                        : detailsSubmission.aiAnalysisStatus === "AUTO_APPROVED" ||
                            detailsSubmission.aiAnalysisStatus === "AI_SUGGESTS_APPROVAL"
                          ? "The automated document pre-check confirmed the document format and key regulatory fields. Official approval will be finalized by a RURA Auditor."
                          : "Your document is currently being evaluated by automated pre-check routines."}
                    </p>

                    {/^Extracted: /.test(
                      detailsSubmission.aiAnalysisDetails || "",
                    ) && (
                      <div className="mt-2 rounded-lg bg-white/80 p-3 border border-gray-200/60">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Extracted Document Details
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          {[
                            "company",
                            "docType",
                            "docNumber",
                            "authority",
                            "issueDate",
                            "expiry",
                          ].map((key) => {
                            const match = detailsSubmission.aiAnalysisDetails.match(
                              new RegExp(key + "=([^,]+)"),
                            );
                            if (!match || match[1] === "null" || !match[1].trim()) return null;
                            const label =
                              key === "docType"
                                ? "Doc Type"
                                : key === "docNumber"
                                  ? "Doc Number"
                                  : key === "issueDate"
                                    ? "Issue Date"
                                    : key === "expiry"
                                      ? "Expiry Date"
                                      : key === "authority"
                                        ? "Authority"
                                        : "Company";
                            return (
                              <div key={key} className="contents">
                                <span className="font-medium text-gray-500">
                                  {label}
                                </span>
                                <span
                                  className={`text-gray-800 ${key === "docNumber" ? "font-mono" : ""}`}
                                >
                                  {match[1]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {detailsSubmission.documentSummary && (
                      <div className="mt-3 border-t border-gray-200/60 pt-3">
                        <p className="mb-1 text-xs font-semibold text-gray-700">
                          Document Summary
                        </p>
                        <p className="text-xs leading-relaxed text-gray-600">
                          {detailsSubmission.documentSummary}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border p-4 ${
                      detailsSubmission.aiAnalysisStatus === "AUTO_APPROVED" ||
                      detailsSubmission.aiAnalysisStatus ===
                        "AI_SUGGESTS_APPROVAL"
                        ? "border-green-200 bg-green-50"
                        : detailsSubmission.aiAnalysisStatus ===
                              "AUTO_REJECTED" ||
                            detailsSubmission.aiAnalysisStatus ===
                              "AI_SUGGESTS_REJECTION"
                          ? "border-red-200 bg-red-50"
                          : detailsSubmission.aiAnalysisStatus ===
                              "PENDING_REVIEW"
                            ? "border-amber-200 bg-amber-50"
                            : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-800">
                        AI Analysis
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          detailsSubmission.aiAnalysisStatus ===
                            "AUTO_APPROVED" ||
                          detailsSubmission.aiAnalysisStatus ===
                            "AI_SUGGESTS_APPROVAL"
                            ? "bg-green-200 text-green-800"
                            : detailsSubmission.aiAnalysisStatus ===
                                  "AUTO_REJECTED" ||
                                detailsSubmission.aiAnalysisStatus ===
                                  "AI_SUGGESTS_REJECTION"
                              ? "bg-red-200 text-red-800"
                              : detailsSubmission.aiAnalysisStatus ===
                                  "PENDING_REVIEW"
                                ? "bg-amber-200 text-amber-800"
                                : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {detailsSubmission.aiAnalysisStatus}
                      </span>
                    </div>
                    {/^Extracted: /.test(
                      detailsSubmission.aiAnalysisDetails || "",
                    ) ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {[
                          "company",
                          "expiry",
                          "complianceStatus",
                          "docType",
                          "docNumber",
                          "authority",
                          "issueDate",
                          "personName",
                          "address",
                        ].map((key) => {
                          const match = detailsSubmission.aiAnalysisDetails.match(
                            new RegExp(key + "=([^,]+)"),
                          );
                          if (!match || match[1] === "null") return null;
                          const label =
                            key === "complianceStatus"
                              ? "Compliance"
                              : key === "docType"
                                ? "Doc Type"
                                : key === "docNumber"
                                  ? "Doc Number"
                                  : key === "personName"
                                    ? "Person Name"
                                    : key === "issueDate"
                                      ? "Issue Date"
                                      : key === "authority"
                                        ? "Authority"
                                        : key.charAt(0).toUpperCase() +
                                          key.slice(1);
                          return (
                            <div key={key} className="contents">
                              <span className="font-medium text-gray-500">
                                {label}
                              </span>
                              <span
                                className={`text-gray-800 ${key === "docNumber" ? "font-mono" : ""}`}
                              >
                                {match[1]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-xs text-gray-600">
                        {detailsSubmission.aiAnalysisDetails || "No details"}
                      </p>
                    )}
                    {detailsSubmission.documentSummary && (
                      <div className="mt-3 border-t border-gray-200/60 pt-3">
                        <p className="mb-1 text-xs font-semibold text-gray-700">
                          Document Summary
                        </p>
                        <p className="text-xs leading-relaxed text-gray-600">
                          {detailsSubmission.documentSummary}
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}

              {detailsSubmission.fileChecksum && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">
                      SHA-256 Integrity
                    </span>
                  </div>
                  <code className="mt-1 block break-all text-xs text-gray-400">
                    {detailsSubmission.fileChecksum}
                  </code>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {canReview &&
                  (detailsSubmission.aiAnalysisStatus === "PENDING_REVIEW" ||
                    detailsSubmission.aiAnalysisStatus ===
                      "AI_SUGGESTS_APPROVAL" ||
                    detailsSubmission.aiAnalysisStatus ===
                      "AI_SUGGESTS_REJECTION") && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openReview(detailsSubmission);
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Review
                    </button>
                  )}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `${API_URL}/submissions/${detailsSubmission.id}/download`,
                        {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                          },
                        },
                      );
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = detailsSubmission.id + ".pdf";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error("Download error:", e);
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
