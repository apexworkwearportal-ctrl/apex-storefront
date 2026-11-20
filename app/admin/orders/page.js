"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { 
  ShoppingBag, 
  Eye, 
  Clock, 
  Mail, 
  Truck, 
  ChevronRight, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Loader2,
  RefreshCw,
  UploadCloud,
  Trash2,
  Plus,
  Edit2,
  Package,
  DollarSign
} from "lucide-react";

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "all";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submittingSinalite, setSubmittingSinalite] = useState(false);
  const [approvingProof, setApprovingProof] = useState(false);
  const [uploadingArtworkIdx, setUploadingArtworkIdx] = useState(null);
  const [artworkStatusMsg, setArtworkStatusMsg] = useState("");

  // Custom Email Modal States
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailMessage, setCustomEmailMessage] = useState("");
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [customEmailStatus, setCustomEmailStatus] = useState("");

  // Shipping Adjustment States (Admin)
  const [isChangingShipping, setIsChangingShipping] = useState(false);
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false);
  const [availableShippingMethods, setAvailableShippingMethods] = useState([]);
  const [shippingMethodsError, setShippingMethodsError] = useState("");
  const [selectedNewShippingMethod, setSelectedNewShippingMethod] = useState("");
  const [selectedNewShippingPrice, setSelectedNewShippingPrice] = useState(0);
  const [savingShippingUpdate, setSavingShippingUpdate] = useState(false);

  // Tracking details state (Admin)
  const [carrierInput, setCarrierInput] = useState("");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingSuccessMsg, setTrackingSuccessMsg] = useState("");

  // Abandoned Checkouts recovery & delete states
  const [recoveryModalOrder, setRecoveryModalOrder] = useState(null);
  const [recoveryTemplate, setRecoveryTemplate] = useState("discount_10");
  const [recoveryDiscountCode, setRecoveryDiscountCode] = useState("SAVE10");
  const [recoverySubject, setRecoverySubject] = useState("Take 10% Off Your Pending Order - Apex Workwear");
  const [recoveryCustomMessage, setRecoveryCustomMessage] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoveryStatusMsg, setRecoveryStatusMsg] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  // Editable destination address fields
  const [editAddress, setEditAddress] = useState({
    ShipAddr: "",
    ShipAddr2: "",
    ShipCity: "",
    ShipState: "",
    ShipZip: "",
    ShipCountry: "CA",
    ShipPhone: "",
    ShipFName: "",
    ShipLName: ""
  });

  useEffect(() => {
    if (selectedOrder) {
      setCarrierInput(selectedOrder.carrier || "UPS");
      setTrackingNumberInput(selectedOrder.trackingNumber || selectedOrder.shippingTrackingNumber || selectedOrder.sinaliteTrackingNumber || "");
      setTrackingUrlInput(selectedOrder.trackingUrl || "");
      setTrackingSuccessMsg("");
    }
  }, [selectedOrder]);

  const handleSaveTracking = async (notifyCustomer = false) => {
    if (!selectedOrder?.id) return;
    setSavingTracking(true);
    setTrackingSuccessMsg("");
    try {
      const res = await fetch("/api/admin/orders/update-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          carrier: carrierInput,
          trackingNumber: trackingNumberInput,
          trackingUrl: trackingUrlInput,
          notifyCustomer
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update tracking details");
      }

      const updated = data.order;
      setSelectedOrder(prev => prev ? ({ ...prev, ...updated }) : null);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updated } : o));

      setTrackingSuccessMsg(notifyCustomer ? "Tracking saved and email sent to customer!" : "Tracking details saved!");
      setTimeout(() => setTrackingSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Save tracking error:", err);
      alert(`Could not save tracking: ${err.message}`);
    } finally {
      setSavingTracking(false);
    }
  };

  const handleOpenShippingChange = async (order) => {
    if (!order) return;
    setIsChangingShipping(true);
    setShippingMethodsError("");
    setAvailableShippingMethods([]);
    setSelectedNewShippingMethod("");
    setSelectedNewShippingPrice(0);

    const addr = order.shippingAddress || {};
    setEditAddress({
      ShipAddr: addr.ShipAddr || addr.address || "",
      ShipAddr2: addr.ShipAddr2 || addr.apartment || "",
      ShipCity: addr.ShipCity || addr.city || "",
      ShipState: addr.ShipState || addr.state || "ON",
      ShipZip: addr.ShipZip || addr.zip || "",
      ShipCountry: addr.ShipCountry || addr.country || "CA",
      ShipPhone: addr.ShipPhone || addr.phone || "",
      ShipFName: addr.ShipFName || addr.fullName?.split(" ")?.[0] || "",
      ShipLName: addr.ShipLName || addr.fullName?.split(" ")?.slice(1)?.join(" ") || ""
    });

    await fetchShippingMethodsForOrder(order.id);
  };

  const fetchShippingMethodsForOrder = async (orderId) => {
    setLoadingShippingMethods(true);
    setShippingMethodsError("");
    try {
      const res = await fetch("/api/admin/orders/shipping-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch shipping rates from SinaLite.");
      }
      setAvailableShippingMethods(data.methods || []);
      if (data.methods && data.methods.length > 0) {
        // Pre-select matching or first method
        const match = data.methods.find(m => m.serviceName === data.currentMethod) || data.methods[0];
        setSelectedNewShippingMethod(match.serviceName);
        setSelectedNewShippingPrice(match.price);
      }
    } catch (err) {
      console.error("Shipping methods fetch error:", err);
      setShippingMethodsError(err.message || "Failed to retrieve shipping options from SinaLite.");
    } finally {
      setLoadingShippingMethods(false);
    }
  };

  const handleSaveShippingUpdate = async (orderId) => {
    if (!orderId || !selectedNewShippingMethod) return;
    setSavingShippingUpdate(true);
    try {
      const res = await fetch("/api/admin/orders/update-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newShippingMethod: selectedNewShippingMethod,
          newShippingPrice: selectedNewShippingPrice,
          updatedAddress: editAddress
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update shipping method.");
      }

      // Update local state without modifying customer charged totals
      const updatedOrder = data.order;
      setSelectedOrder(prev => prev ? ({ ...prev, ...updatedOrder }) : null);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));

      alert(`Shipping method successfully updated to "${selectedNewShippingMethod}"!`);
      setIsChangingShipping(false);
    } catch (err) {
      console.error("Save shipping error:", err);
      alert(`Could not save shipping update: ${err.message}`);
    } finally {
      setSavingShippingUpdate(false);
    }
  };

  const handleAdminArtworkUpload = async (orderId, itemIndex, file, targetSide = null) => {
    if (!file || !orderId || itemIndex === undefined) return;
    setUploadingArtworkIdx(itemIndex);
    setArtworkStatusMsg("Uploading new artwork file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload file to storage.");
      }

      setArtworkStatusMsg("Saving updated artwork to order...");

      const currentItem = selectedOrder.items?.[itemIndex];
      const existingFiles = Array.isArray(currentItem?.artworkFiles) ? [...currentItem.artworkFiles] : [];

      let updatedFiles = [];
      if (targetSide) {
        // Replace or add artwork for specific side
        const sideIdx = existingFiles.findIndex(f => f.side === targetSide);
        const newEntry = {
          name: file.name,
          url: uploadData.url,
          side: targetSide,
          size: uploadData.size,
          uploadedBy: "admin",
          uploadedAt: new Date().toISOString()
        };
        if (sideIdx >= 0) {
          existingFiles[sideIdx] = newEntry;
          updatedFiles = existingFiles;
        } else {
          updatedFiles = [...existingFiles, newEntry];
        }
      } else {
        // Append or replace main file
        updatedFiles = [
          ...existingFiles,
          {
            name: file.name,
            url: uploadData.url,
            side: existingFiles.length === 0 ? "front" : (existingFiles.length === 1 ? "back" : `side_${existingFiles.length + 1}`),
            size: uploadData.size,
            uploadedBy: "admin",
            uploadedAt: new Date().toISOString()
          }
        ];
      }

      const saveRes = await fetch("/api/admin/orders/update-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemIndex,
          artworkFiles: updatedFiles
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || "Failed to update order in database.");
      }

      // Update local state
      setSelectedOrder(prev => {
        if (!prev) return null;
        const newItems = [...(prev.items || [])];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          artworkFiles: updatedFiles,
          artworkUrl: updatedFiles[0]?.url || newItems[itemIndex].artworkUrl,
          artworkModifiedByAdmin: true
        };
        return { ...prev, items: newItems };
      });

      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const newItems = [...(o.items || [])];
        if (newItems[itemIndex]) {
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            artworkFiles: updatedFiles,
            artworkUrl: updatedFiles[0]?.url || newItems[itemIndex].artworkUrl,
            artworkModifiedByAdmin: true
          };
        }
        return { ...o, items: newItems };
      }));

      setArtworkStatusMsg("Artwork updated successfully!");
      setTimeout(() => setArtworkStatusMsg(""), 3500);
    } catch (err) {
      console.error("Failed to upload/update artwork:", err);
      alert(`Artwork update failed: ${err.message}`);
      setArtworkStatusMsg("");
    } finally {
      setUploadingArtworkIdx(null);
    }
  };

  const handleAdminRemoveArtworkFile = async (orderId, itemIndex, fileIndex) => {
    if (!window.confirm("Are you sure you want to remove this artwork file?")) return;
    setUploadingArtworkIdx(itemIndex);
    setArtworkStatusMsg("Removing file...");

    try {
      const currentItem = selectedOrder.items?.[itemIndex];
      const existingFiles = Array.isArray(currentItem?.artworkFiles) ? [...currentItem.artworkFiles] : [];
      const updatedFiles = existingFiles.filter((_, idx) => idx !== fileIndex);

      const saveRes = await fetch("/api/admin/orders/update-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemIndex,
          artworkFiles: updatedFiles
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || "Failed to update order in database.");
      }

      // Update local state
      setSelectedOrder(prev => {
        if (!prev) return null;
        const newItems = [...(prev.items || [])];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          artworkFiles: updatedFiles,
          artworkUrl: updatedFiles[0]?.url || null,
          artworkModifiedByAdmin: true
        };
        return { ...prev, items: newItems };
      });

      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const newItems = [...(o.items || [])];
        if (newItems[itemIndex]) {
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            artworkFiles: updatedFiles,
            artworkUrl: updatedFiles[0]?.url || null,
            artworkModifiedByAdmin: true
          };
        }
        return { ...o, items: newItems };
      }));

      setArtworkStatusMsg("Artwork file removed.");
      setTimeout(() => setArtworkStatusMsg(""), 3500);
    } catch (err) {
      console.error("Failed to remove artwork:", err);
      alert(`Failed to remove artwork: ${err.message}`);
      setArtworkStatusMsg("");
    } finally {
      setUploadingArtworkIdx(null);
    }
  };

  const handleManualSubmitSinalite = async (orderId) => {
    if (!orderId) return;
    setSubmittingSinalite(true);
    try {
      const res = await fetch("/api/admin/orders/submit-sinalite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || `Order successfully transmitted to SinaLite! Ref ID: #${data.sinaliteOrderId}`);
        setSelectedOrder(prev => prev ? ({ ...prev, sinaliteOrderId: data.sinaliteOrderId, status: "submitted" }) : null);
        fetchOrders();
      } else {
        alert(`Failed to submit to SinaLite: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error submitting to SinaLite: ${err.message}`);
    } finally {
      setSubmittingSinalite(false);
    }
  };

  const handleApproveProof = async (orderId) => {
    if (!orderId) return;
    setApprovingProof(true);
    try {
      const res = await fetch("/api/admin/orders/approve-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Digital proof approved successfully! SinaLite has been notified to proceed with printing.");
        setSelectedOrder(prev => prev ? ({ ...prev, sinaliteProofStatus: "approved" }) : null);
        fetchOrders();
      } else {
        alert(`Failed to approve proof: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error approving proof: ${err.message}`);
    } finally {
      setApprovingProof(false);
    }
  };

  const handleDeleteAbandonedOrder = async (order) => {
    if (!order?.id) return;
    const confirmDelete = window.confirm(`Permanently delete abandoned checkout #${order.id.slice(0, 8)}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingOrderId(order.id);
    try {
      const res = await fetch("/api/admin/orders/delete-abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          isPendingCollection: Boolean(order.isPendingCollection)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete order");
      }

      setOrders(prev => prev.filter(o => o.id !== order.id));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
      alert("Abandoned checkout successfully deleted.");
    } catch (err) {
      console.error("Delete abandoned order error:", err);
      alert(`Could not delete order: ${err.message}`);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleSendRecoveryEmail = async () => {
    if (!recoveryModalOrder) return;
    setSendingRecovery(true);
    setRecoveryStatusMsg("");
    try {
      const res = await fetch("/api/admin/orders/send-recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: recoveryModalOrder.id,
          isPendingCollection: Boolean(recoveryModalOrder.isPendingCollection),
          templateId: recoveryTemplate,
          discountCode: recoveryDiscountCode,
          customSubject: recoverySubject,
          customMessage: recoveryCustomMessage
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send recovery email");
      }

      const sentTime = new Date().toISOString();
      setOrders(prev => prev.map(o => o.id === recoveryModalOrder.id ? { ...o, recoveryEmailSentAt: sentTime, recoveryEmailTemplate: recoveryTemplate } : o));
      if (selectedOrder?.id === recoveryModalOrder.id) {
        setSelectedOrder(prev => prev ? ({ ...prev, recoveryEmailSentAt: sentTime, recoveryEmailTemplate: recoveryTemplate }) : null);
      }

      setRecoveryStatusMsg("Recovery offer email sent successfully!");
      setTimeout(() => {
        setRecoveryModalOrder(null);
        setRecoveryStatusMsg("");
      }, 1500);
    } catch (err) {
      console.error("Send recovery email error:", err);
      setRecoveryStatusMsg(`Failed: ${err.message}`);
    } finally {
      setSendingRecovery(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = [];

      // 1. Fetch completed/submitted orders
      try {
        const snap = await getDocs(collection(db, "orders"));
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data(), isPendingCollection: false });
        });
      } catch (e1) {
        console.error("Error fetching orders collection:", e1);
      }

      // 2. Fetch pending orders
      try {
        const pendingSnap = await getDocs(collection(db, "pendingOrders"));
        pendingSnap.forEach(doc => {
          if (!list.some(o => o.id === doc.id)) {
            list.push({ id: doc.id, ...doc.data(), isPendingCollection: true });
          }
        });
      } catch (e2) {
        console.error("Error fetching pendingOrders collection:", e2);
      }

      // 3. Sort chronologically (newest first)
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setOrders(list);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }

      // Prompt admin if they want to notify the customer via email
      const sendEmail = window.confirm(
        `Order status updated to "${newStatus.toUpperCase()}".\n\nDo you want to send an email notification to the customer?`
      );

      if (sendEmail) {
        setArtworkStatusMsg("Sending status update email to customer...");
        try {
          const res = await fetch("/api/admin/orders/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              type: "status_update",
              statusText: newStatus,
              trackingNumber: selectedOrder?.sinaliteTrackingNumber || selectedOrder?.trackingNumber || ""
            })
          });
          const data = await res.json();
          if (data.success) {
            setArtworkStatusMsg("Status update email sent to customer!");
          } else {
            setArtworkStatusMsg(data.error ? `Failed to send email: ${data.error}` : "Failed to send email");
          }
        } catch (emailErr) {
          console.error("Error sending status email:", emailErr);
          setArtworkStatusMsg("Failed to send status email");
        }
        setTimeout(() => setArtworkStatusMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleSendCustomEmail = async (e) => {
    e?.preventDefault();
    if (!customEmailMessage.trim()) {
      alert("Please enter a message before sending.");
      return;
    }
    setSendingCustomEmail(true);
    setCustomEmailStatus("");
    try {
      const res = await fetch("/api/admin/orders/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          type: "custom",
          subject: customEmailSubject,
          message: customEmailMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setCustomEmailStatus("Email sent successfully!");
        setTimeout(() => {
          setEmailModalOpen(false);
          setCustomEmailStatus("");
        }, 1500);
      } else {
        setCustomEmailStatus(data.error || "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      setCustomEmailStatus("Network error sending email");
    } finally {
      setSendingCustomEmail(false);
    }
  };

  const handleTabChange = (tabKey) => {
    const url = tabKey === "all" ? "/admin/orders" : `/admin/orders?tab=${tabKey}`;
    router.push(url);
  };

  // Separate Paid Orders vs Abandoned / Pending Payment
  const isPaidOrder = (o) => {
    if (o.isPendingCollection) return false;
    if (o.paymentStatus === "pending" || o.status === "payment_pending") return false;
    return true;
  };

  const paidOrders = orders.filter(isPaidOrder);
  const abandonedOrders = orders.filter(o => !isPaidOrder(o));

  // Filter paid orders by active tab
  const proofOrders = paidOrders.filter(o => 
    o.sinaliteReviewURL || 
    (o.items && o.items.some(i => i.artworkFiles && i.artworkFiles.length > 0)) ||
    o.sinaliteProofStatus
  );

  const unsubmittedOrders = paidOrders.filter(o => 
    !o.sinaliteOrderId && o.status !== "completed" && o.status !== "shipped"
  );

  const completedOrders = paidOrders.filter(o => 
    o.status === "completed" || o.status === "shipped" || o.sinaliteTrackingNumber
  );

  let displayedOrders = paidOrders;
  if (currentTab === "abandoned") {
    displayedOrders = abandonedOrders;
  } else if (currentTab === "proofs") {
    displayedOrders = proofOrders;
  } else if (currentTab === "unsubmitted") {
    displayedOrders = unsubmittedOrders;
  } else if (currentTab === "shipped") {
    displayedOrders = completedOrders;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", fontWeight: 900 }}>
          {currentTab === "proofs" 
            ? "Print Proof Review Queue" 
            : currentTab === "abandoned"
              ? "Abandoned Checkouts"
              : "Order Manager"}
        </h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
          {currentTab === "proofs"
            ? "Inspect customer uploaded artwork files, digital SinaLite proof links, and grant print approvals."
            : currentTab === "abandoned"
              ? "Checkouts initiated by customers where payment was not completed on Stripe. These are NOT active production orders."
              : "Inspect paid customer orders, live SinaLite transmission statuses, proofs, and shipping tracking."}
        </p>
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: "2px solid hsl(var(--border-hsl))",
        marginBottom: "1.75rem",
        overflowX: "auto",
        paddingBottom: "2px"
      }}>
        <button
          onClick={() => handleTabChange("all")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "all" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "all" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "all" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <ShoppingBag size={16} /> All Orders ({paidOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("proofs")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "proofs" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "proofs" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "proofs" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Printer size={16} /> Print Proof Review ({proofOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("unsubmitted")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "unsubmitted" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "unsubmitted" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "unsubmitted" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Clock size={16} /> Awaiting Submission ({unsubmittedOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("shipped")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "shipped" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "shipped" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "shipped" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Truck size={16} /> Shipped & Completed ({completedOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("abandoned")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "abandoned" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "abandoned" ? "3px solid #D97706" : "3px solid transparent",
            color: currentTab === "abandoned" ? "#D97706" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <AlertCircle size={16} /> Abandoned Checkouts ({abandonedOrders.length})
        </button>
      </div>

      {currentTab === "proofs" && (
        <div className="card" style={{ backgroundColor: "hsl(var(--primary-hsl) / 0.05)", borderColor: "hsl(var(--primary-hsl) / 0.2)", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Printer size={20} style={{ color: "hsl(var(--primary-hsl))" }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "hsl(var(--primary-hsl))" }}>Print Proof Review Queue</span>
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
              Orders below contain customer uploaded artwork files or active SinaLite digital proofs awaiting review or approval.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <Loader2 className="animate-spin" size={24} style={{ display: "inline-block", marginRight: "0.5rem" }} /> Loading orders...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5, display: "inline-block" }} />
          <p>No orders found in this view.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "1.2fr 1fr" : "1fr", gap: "2rem" }}>
          {/* Left: Orders list table */}
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Order ID</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Proof / Artwork</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Placed Date</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Total</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(order => {
                  const hasArtwork = order.items && order.items.some(i => i.artworkFiles && i.artworkFiles.length > 0);
                  const orderProofUrl = order.sinaliteReviewURL || 
                    order.reviewURL || 
                    order.proofUrl ||
                    order.sinaliteReviewFILE ||
                    (order.items && order.items.find(i => i.reviewURL || i.reviewFILE)?.reviewURL) ||
                    (order.items && order.items.find(i => i.reviewURL || i.reviewFILE)?.reviewFILE);
                  const hasSinaliteProof = !!orderProofUrl;
                  const isProofApproved = order.sinaliteProofStatus === "approved";

                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: selectedOrder?.id === order.id ? "hsl(var(--secondary-hsl) / 0.3)" : "transparent" }}>
                      <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
                        <div>
                          <p style={{ margin: 0 }}>{order.id.slice(0, 10)}</p>
                          {order.sinaliteOrderId && (
                            <span style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 700, display: "inline-block", marginTop: "2px" }}>
                              SinaLite #{order.sinaliteOrderId}
                            </span>
                          )}
                          {order.orderType && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              display: "block",
                              marginTop: "2px",
                              color: order.orderType === "apparel" ? "#D97706" : "#2563EB"
                            }}>
                              {order.orderType === "apparel" ? "👕 Apparel" : order.orderType === "custom_print" ? "🖨️ Custom Print" : "🖨️ Print"}
                            </span>
                          )}
                          {(order.promoCode?.code || parseFloat(order.totals?.discount || 0) > 0) && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              backgroundColor: "#DCFCE7",
                              color: "#166534",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                              display: "inline-block",
                              marginTop: "2px"
                            }}>
                              🏷️ {order.promoCode?.code || "DISCOUNT"} (-${parseFloat(order.totals?.discount || order.promoCode?.discountAmount || 0).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <p style={{ fontWeight: 500 }}>{order.shippingAddress?.ShipFName} {order.shippingAddress?.ShipLName}</p>
                        <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>{order.shippingAddress?.ShipEmail}</p>
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        {hasSinaliteProof ? (
                          <a
                            href={orderProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "0.25rem 0.55rem",
                              borderRadius: "4px",
                              backgroundColor: isProofApproved ? "#D1FAE5" : "#FEF3C7",
                              color: isProofApproved ? "#065F46" : "#92400E",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              textDecoration: "none",
                              border: isProofApproved ? "1px solid #A7F3D0" : "1px solid #FCD34D",
                              cursor: "pointer"
                            }}
                          >
                            {isProofApproved ? <CheckCircle2 size={12} /> : <Printer size={12} />}
                            {isProofApproved ? "Proof Approved" : "Inspect Proof"} <ExternalLink size={11} />
                          </a>
                        ) : hasArtwork ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.25rem 0.55rem",
                              borderRadius: "4px",
                              backgroundColor: "hsl(var(--primary-hsl) / 0.1)",
                              color: "hsl(var(--primary-hsl))",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <FileText size={12} /> Customer Artwork
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>No Artwork</span>
                        )}
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem", fontSize: "0.85rem" }}>
                        {new Date(order.createdAt?.seconds * 1000 || order.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem", fontWeight: 700 }}>
                        ${parseFloat(order.totals?.grandTotal || 0).toFixed(2)} CAD
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        {!isPaidOrder(order) ? (
                          <span style={{
                            display: "inline-block",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "0.25rem 0.55rem",
                            borderRadius: "4px",
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                            border: "1px solid #FCD34D"
                          }}>
                            ⚠️ Payment Pending
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-block",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: order.status === "completed" ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--accent-hsl) / 0.1)",
                            color: order.status === "completed" ? "hsl(var(--success-hsl))" : "hsl(var(--accent-hsl))"
                          }}>
                            {order.status}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn btn-outline"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <Eye size={13} /> View
                          </button>
                          {!isPaidOrder(order) && (
                            <>
                              <button
                                onClick={() => {
                                  setRecoveryModalOrder(order);
                                  setRecoveryTemplate("discount_10");
                                  setRecoveryDiscountCode("SAVE10");
                                  setRecoverySubject("Take 10% Off Your Pending Order - Apex Workwear");
                                  setRecoveryCustomMessage("");
                                  setRecoveryStatusMsg("");
                                }}
                                title="Send Recovery Offer Email"
                                className="btn btn-outline"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#0284C7", borderColor: "#BAE6FD" }}
                              >
                                <Mail size={13} /> Email Offer
                              </button>
                              <button
                                onClick={() => handleDeleteAbandonedOrder(order)}
                                disabled={deletingOrderId === order.id}
                                title="Delete Abandoned Checkout"
                                className="btn btn-outline"
                                style={{ padding: "0.35rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", color: "#DC2626", borderColor: "#FECACA" }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: Detailed View */}
          {selectedOrder && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                <h2 style={{ fontSize: "1.3rem" }}>
                  {!isPaidOrder(selectedOrder) ? "Abandoned Checkout Details" : "Order Details"}
                </h2>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}>
                  Close
                </button>
              </div>

              {/* Abandoned / Unpaid Notice */}
              {!isPaidOrder(selectedOrder) && (
                <div style={{
                  padding: "1rem",
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FCD34D",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#92400E", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <AlertCircle size={16} /> Payment Pending / Abandoned Checkout
                  </span>
                  <p style={{ fontSize: "0.75rem", color: "#78350F", margin: 0, lineHeight: 1.4 }}>
                    The customer initiated checkout but did not complete payment on Stripe. This is not an active production order.
                  </p>
                  {selectedOrder.stripeCheckoutUrl && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                      <a
                        href={selectedOrder.stripeCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", backgroundColor: "#D97706", borderColor: "#B45309", color: "white" }}
                      >
                        <ExternalLink size={13} /> Open Stripe Payment Link
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrder.stripeCheckoutUrl);
                          alert("Stripe Checkout URL copied to clipboard!");
                        }}
                        className="btn btn-outline"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem" }}
                      >
                        Copy Payment Link
                      </button>
                    </div>
                  )}

                  {/* Recovery Email & Delete Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryModalOrder(selectedOrder);
                        setRecoveryTemplate("discount_10");
                        setRecoveryDiscountCode("SAVE10");
                        setRecoverySubject("Take 10% Off Your Pending Order - Apex Workwear");
                        setRecoveryCustomMessage("");
                        setRecoveryStatusMsg("");
                      }}
                      className="btn btn-primary"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", backgroundColor: "#0284C7", borderColor: "#0369A1", color: "white" }}
                    >
                      <Mail size={13} /> Send Recovery Offer Email
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAbandonedOrder(selectedOrder)}
                      disabled={deletingOrderId === selectedOrder.id}
                      className="btn btn-outline"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#DC2626", borderColor: "#FCA5A5" }}
                    >
                      <Trash2 size={13} /> {deletingOrderId === selectedOrder.id ? "Deleting..." : "Delete Abandoned Checkout"}
                    </button>
                  </div>

                  {selectedOrder.recoveryEmailSentAt && (
                    <div style={{ fontSize: "0.72rem", color: "#065F46", backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0", padding: "0.3rem 0.6rem", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.25rem" }}>
                      <CheckCircle2 size={12} /> Recovery email sent on {new Date(selectedOrder.recoveryEmailSentAt).toLocaleDateString()} ({selectedOrder.recoveryEmailTemplate || "offer"})
                    </div>
                  )}
                </div>
              )}

              {/* Order IDs & Linkage Display */}
              <div style={{ padding: "0.85rem", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                    {!isPaidOrder(selectedOrder) ? "Checkout ID" : "Storefront Order ID"}
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "#0F172A" }}>{selectedOrder.id}</span>
                </div>

                {selectedOrder.sinaliteOrderId ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #E2E8F0", paddingTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>SinaLite Supplier Job ID</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.9rem", color: "#059669" }}>#{selectedOrder.sinaliteOrderId}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #E2E8F0", paddingTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Order Type / Status</span>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: !isPaidOrder(selectedOrder) ? "#D97706" : "#2563EB" }}>
                      {!isPaidOrder(selectedOrder) ? "Unpaid (Awaiting Payment)" : (selectedOrder.orderType === "apparel" ? "Apparel Workshop (In-house)" : "Awaiting SinaLite Transmission")}
                    </span>
                  </div>
                )}
              </div>

              {/* SinaLite Submission Box - Only for Paid Orders */}
              {isPaidOrder(selectedOrder) && !selectedOrder.sinaliteOrderId && selectedOrder.orderType !== "apparel" && (
                <div style={{ padding: "1rem", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E40AF" }}>
                    ⚡ SinaLite Order Dispatch
                  </span>
                  <p style={{ fontSize: "0.75rem", color: "#1E3A8A", margin: 0 }}>
                    Transmits print jobs and artwork to SinaLite wholesale fulfillment production queue.
                  </p>
                  <button
                    onClick={() => handleManualSubmitSinalite(selectedOrder.id)}
                    disabled={submittingSinalite}
                    className="btn btn-primary"
                    style={{ marginTop: "0.25rem", padding: "0.45rem 1rem", fontSize: "0.8rem", alignSelf: "flex-start", backgroundColor: "#2563EB", color: "white" }}
                  >
                    {submittingSinalite ? "Submitting..." : "Send Job to SinaLite API Now"}
                  </button>
                </div>
              )}

              {/* Proof Review Box */}
              {(() => {
                const selectedProofUrl = selectedOrder.sinaliteReviewURL || 
                  selectedOrder.reviewURL || 
                  selectedOrder.proofUrl ||
                  selectedOrder.sinaliteReviewFILE ||
                  (selectedOrder.items && selectedOrder.items.find(i => i.reviewURL || i.reviewFILE)?.reviewURL) ||
                  (selectedOrder.items && selectedOrder.items.find(i => i.reviewURL || i.reviewFILE)?.reviewFILE);

                if (!isPaidOrder(selectedOrder) || !selectedProofUrl) return null;

                return (
                  <div style={{ padding: "1rem", backgroundColor: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#92400E", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Printer size={15} /> Digital Proof Approval Required
                    </span>
                    <p style={{ fontSize: "0.75rem", color: "#78350F", margin: 0 }}>
                      SinaLite has generated a digital proof file for this print job. Review and approve to proceed to production.
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      <a
                        href={selectedProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                      >
                        <Eye size={14} /> Open Digital Proof <ExternalLink size={12} />
                      </a>

                      {selectedOrder.sinaliteProofStatus !== "approved" ? (
                        <button
                          onClick={() => handleApproveProof(selectedOrder.id)}
                          disabled={approvingProof}
                          className="btn btn-primary"
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                        >
                          {approvingProof ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve Proof for Production
                        </button>
                      ) : (
                        <span style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontWeight: 800, color: "#065F46", backgroundColor: "#D1FAE5", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <CheckCircle2 size={14} /> Proof Approved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status Updater - Only for Paid Orders */}
              {isPaidOrder(selectedOrder) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label className="label" style={{ margin: 0 }}>Update Order Status</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEmailSubject(`Regarding your Apex Workwear & Print Order #${(selectedOrder.id || "").substring(0, 8)}`);
                        setCustomEmailMessage("");
                        setCustomEmailStatus("");
                        setEmailModalOpen(true);
                      }}
                      className="btn btn-outline"
                      style={{ padding: "0.25rem 0.65rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      <Mail size={13} /> Send Email to Customer
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {["pending", "processing", "submitted", "in_production", "ready_to_pickup", "shipped", "completed", "cancelled"].map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                        style={{
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          borderRadius: "4px",
                          border: "1px solid",
                          borderColor: selectedOrder.status === status ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                          backgroundColor: selectedOrder.status === status ? "hsl(var(--accent-hsl) / 0.1)" : "transparent",
                          color: selectedOrder.status === status ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
                          cursor: "pointer"
                        }}
                      >
                        {status === "ready_to_pickup" ? "Ready for Pickup" : status.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Details & Admin Shipping Adjustment */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Truck size={16} /> Shipping &amp; Fulfillment
                  </h3>

                  {/* Option to change shipping only for SinaLite print orders not yet submitted */}
                  {isPaidOrder(selectedOrder) && !selectedOrder.sinaliteOrderId && selectedOrder.orderType !== "apparel" && !selectedOrder.isPickup && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isChangingShipping) {
                          setIsChangingShipping(false);
                        } else {
                          handleOpenShippingChange(selectedOrder);
                        }
                      }}
                      className="btn btn-outline"
                      style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Edit2 size={12} />
                      {isChangingShipping ? "Cancel Change" : "Change Shipping Method"}
                    </button>
                  )}
                </div>

                <div style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)", lineHeight: 1.5, backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", padding: "0.85rem", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {/* Store Pickup Banner if applicable */}
                  {(selectedOrder.isPickup || selectedOrder.fulfillmentMethod === "pickup" || String(selectedOrder.shippingAddress?.ShipMethod || "").toLowerCase().includes("pickup")) && (
                    <div style={{
                      backgroundColor: "#F0FDF4",
                      border: "1px solid #86EFAC",
                      borderRadius: "6px",
                      padding: "0.55rem 0.75rem",
                      color: "#166534",
                      fontSize: "0.825rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem"
                    }}>
                      <span>🏬 <strong>Store Pickup Order:</strong> Customer will collect at Mississauga facility (Free).</span>
                      {selectedOrder.status !== "ready_to_pickup" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, "ready_to_pickup")}
                          style={{
                            padding: "0.2rem 0.55rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            borderRadius: "4px",
                            border: "1px solid #86EFAC",
                            backgroundColor: "#DCFCE7",
                            color: "#15803D",
                            cursor: "pointer"
                          }}
                        >
                          Mark Ready for Pickup
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.4rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Assigned Shipping Method:
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "hsl(var(--primary-hsl))" }}>
                        {selectedOrder.shippingMethod || selectedOrder.shippingAddress?.ShipMethod || "Standard Courier Shipping"}
                      </strong>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block" }}>
                        Customer Paid Shipping:
                      </span>
                      <strong style={{ color: "#0F172A" }}>
                        ${parseFloat(selectedOrder.originalShippingCharged !== undefined ? selectedOrder.originalShippingCharged : (selectedOrder.totals?.shipping || 0)).toFixed(2)} CAD
                      </strong>
                    </div>
                  </div>

                  {/* Admin Shipping Expense Notice if adjusted */}
                  {selectedOrder.adminShippingExpense > 0 && (
                    <div style={{
                      backgroundColor: "#FFFBEB",
                      border: "1px solid #FCD34D",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.8rem",
                      color: "#92400E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "0.25rem"
                    }}>
                      <span>
                        ⚠️ <strong>Admin Shipping Expense:</strong> Actual cost (${parseFloat(selectedOrder.actualShippingCost || 0).toFixed(2)}) exceeded customer payment.
                      </span>
                      <strong style={{ color: "#B45309", fontSize: "0.85rem" }}>
                        +${parseFloat(selectedOrder.adminShippingExpense).toFixed(2)} (Store Expense)
                      </strong>
                    </div>
                  )}

                  {/* Destination Address View */}
                  <div style={{ marginTop: "0.2rem" }}>
                    <p style={{ fontWeight: 600, margin: "0 0 0.2rem 0" }}>{selectedOrder.shippingAddress?.ShipFName} {selectedOrder.shippingAddress?.ShipLName}</p>
                    <p style={{ margin: 0 }}>{selectedOrder.shippingAddress?.ShipAddr} {selectedOrder.shippingAddress?.ShipAddr2}</p>
                    <p style={{ margin: 0 }}>{selectedOrder.shippingAddress?.ShipCity}, {selectedOrder.shippingAddress?.ShipState} {selectedOrder.shippingAddress?.ShipZip}</p>
                    <p style={{ margin: 0 }}>{selectedOrder.shippingAddress?.ShipCountry}</p>
                    <p style={{ marginTop: "0.25rem", color: "hsl(var(--muted-hsl))", margin: "0.25rem 0 0 0" }}>📞 {selectedOrder.shippingAddress?.ShipPhone}</p>
                  </div>
                </div>

                {/* Tracking & Carrier Information (Admin) */}
                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.95rem",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Truck size={14} style={{ color: "#2563EB" }} /> Shipping Tracking &amp; Link
                    </span>
                    {trackingSuccessMsg && (
                      <span style={{ fontSize: "0.75rem", color: "#16A34A", fontWeight: 700 }}>
                        ✓ {trackingSuccessMsg}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.6rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#64748B", fontWeight: 700, marginBottom: "0.2rem" }}>Carrier</label>
                      <input
                        type="text"
                        placeholder="UPS, FedEx, etc."
                        value={carrierInput}
                        onChange={(e) => setCarrierInput(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.55rem", fontSize: "0.82rem", borderRadius: "5px", border: "1px solid #CBD5E1" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#64748B", fontWeight: 700, marginBottom: "0.2rem" }}>Tracking Number / Waybill</label>
                      <input
                        type="text"
                        placeholder="e.g. 1Z9999999999999999"
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        style={{ width: "100%", padding: "0.4rem 0.55rem", fontSize: "0.82rem", borderRadius: "5px", border: "1px solid #CBD5E1" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#64748B", fontWeight: 700, marginBottom: "0.2rem" }}>Carrier Tracking Link (URL)</label>
                    <input
                      type="url"
                      placeholder="https://www.ups.com/track?tracknum=..."
                      value={trackingUrlInput}
                      onChange={(e) => setTrackingUrlInput(e.target.value)}
                      style={{ width: "100%", padding: "0.4rem 0.55rem", fontSize: "0.82rem", borderRadius: "5px", border: "1px solid #CBD5E1" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    {trackingUrlInput && (
                      <a
                        href={trackingUrlInput}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <ExternalLink size={12} /> Test Link
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveTracking(false)}
                      disabled={savingTracking}
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    >
                      Save Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveTracking(true)}
                      disabled={savingTracking}
                      className="btn btn-primary"
                      style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      {savingTracking ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      Save &amp; Notify Customer
                    </button>
                  </div>
                </div>

                {/* Inline Shipping Method Selector (Admin Adjustment Modal/Card) */}
                {isChangingShipping && (
                  <div style={{
                    marginTop: "0.75rem",
                    padding: "1rem",
                    backgroundColor: "#FFFFFF",
                    border: "2px solid hsl(var(--accent-hsl))",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.06)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "hsl(var(--accent-hsl))", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        SinaLite Live Shipping Rates
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchShippingMethodsForOrder(selectedOrder.id)}
                        disabled={loadingShippingMethods}
                        className="btn btn-outline"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                      >
                        <RefreshCw size={11} className={loadingShippingMethods ? "animate-spin" : ""} /> Refresh Rates
                      </button>
                    </div>

                    <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-hsl))", margin: 0, lineHeight: 1.45 }}>
                      Select a valid SinaLite shipping method to allow clean automated transmission. Customer will <strong>not</strong> receive an email notification or be charged any extra difference; variances are tracked as admin expenses.
                    </p>

                    {/* Loading or Error */}
                    {loadingShippingMethods ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                        <Loader2 size={16} className="animate-spin" /> Fetching live shipping methods from SinaLite API...
                      </div>
                    ) : shippingMethodsError ? (
                      <div style={{ padding: "0.75rem", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "6px", color: "#B91C1C", fontSize: "0.8rem" }}>
                        {shippingMethodsError}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {availableShippingMethods.map((method, mIdx) => {
                          const isSelected = selectedNewShippingMethod === method.serviceName;
                          const originalPaid = parseFloat(selectedOrder.originalShippingCharged !== undefined ? selectedOrder.originalShippingCharged : (selectedOrder.totals?.shipping || 0));
                          const costDiff = method.price - originalPaid;

                          return (
                            <label
                              key={mIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "6px",
                                border: `1.5px solid ${isSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))"}`,
                                backgroundColor: isSelected ? "hsl(var(--accent-hsl) / 0.05)" : "#F8FAFC",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <input
                                  type="radio"
                                  name="adminShippingMethod"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedNewShippingMethod(method.serviceName);
                                    setSelectedNewShippingPrice(method.price);
                                  }}
                                  style={{ accentColor: "hsl(var(--accent-hsl))" }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "hsl(var(--primary-hsl))" }}>
                                    {method.serviceName}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "hsl(var(--muted-hsl))" }}>
                                    Estimated Transit: {method.deliveryDays} business days
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0F172A" }}>
                                  ${method.price.toFixed(2)} CAD
                                </div>
                                <div style={{ fontSize: "0.7rem", fontWeight: 600 }}>
                                  {costDiff > 0 ? (
                                    <span style={{ color: "#D97706" }}>+${costDiff.toFixed(2)} Store Expense</span>
                                  ) : costDiff < 0 ? (
                                    <span style={{ color: "#16A34A" }}>-${Math.abs(costDiff).toFixed(2)} Saved</span>
                                  ) : (
                                    <span style={{ color: "#64748B" }}>Exact Match</span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setIsChangingShipping(false)}
                        className="btn btn-outline"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveShippingUpdate(selectedOrder.id)}
                        disabled={savingShippingUpdate || !selectedNewShippingMethod}
                        className="btn btn-primary"
                        style={{ padding: "0.4rem 1.15rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        {savingShippingUpdate ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Save Shipping Method
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Order Items ({selectedOrder.items?.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ padding: "0.75rem", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "0.9rem" }}>
                        <span>{item.name}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
                        {item.optionSummary}
                      </p>

                      {/* Customer Artwork Files & Admin Artwork Management */}
                      <div style={{
                        marginTop: "0.5rem",
                        padding: "0.75rem",
                        backgroundColor: "hsl(var(--secondary-hsl) / 0.25)",
                        borderRadius: "6px",
                        border: "1px solid hsl(var(--border-hsl))",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--primary-hsl))", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <FileText size={13} style={{ color: "hsl(var(--accent-hsl))" }} />
                            Production Artwork Files
                            {item.artworkModifiedByAdmin && (
                              <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: "4px", fontWeight: 800 }}>
                                Modified by Admin
                              </span>
                            )}
                          </span>

                          {/* Quick Add / Replace Artwork Input */}
                          <label style={{
                            padding: "0.25rem 0.55rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            borderRadius: "4px",
                            backgroundColor: "hsl(var(--accent-hsl))",
                            color: "white",
                            cursor: uploadingArtworkIdx === idx ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            margin: 0
                          }}>
                            {uploadingArtworkIdx === idx ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {uploadingArtworkIdx === idx ? "Uploading..." : "Add / Replace File"}
                            <input
                              type="file"
                              accept=".pdf,.ai,.eps,.psd,.tiff,.tif,.png,.jpg,.jpeg"
                              disabled={uploadingArtworkIdx !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAdminArtworkUpload(selectedOrder.id, idx, file);
                                }
                                e.target.value = "";
                              }}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>

                        {/* Files list */}
                        {item.artworkFiles && item.artworkFiles.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {item.artworkFiles.map((file, fIdx) => (
                              <div
                                key={fIdx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.35rem 0.55rem",
                                  backgroundColor: "#FFFFFF",
                                  borderRadius: "4px",
                                  border: "1px solid hsl(var(--border-hsl))",
                                  fontSize: "0.75rem"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                                  <span style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    padding: "0.1rem 0.35rem",
                                    backgroundColor: file.side === "back" ? "#E0E7FF" : "#DCFCE7",
                                    color: file.side === "back" ? "#3730A3" : "#166534",
                                    borderRadius: "3px"
                                  }}>
                                    {file.side || (fIdx === 0 ? "front" : "back")}
                                  </span>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "hsl(var(--primary-hsl))",
                                      textDecoration: "underline",
                                      fontWeight: 600,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "180px"
                                    }}
                                    title={file.name}
                                  >
                                    {file.name || `Artwork File ${fIdx + 1}`}
                                  </a>
                                  {file.uploadedBy === "admin" && (
                                    <span style={{ fontSize: "0.65rem", color: "#D97706", fontWeight: 700 }}>
                                      (Admin)
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  {/* Replace specific file input */}
                                  <label style={{
                                    padding: "0.2rem 0.45rem",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    color: "hsl(var(--accent-hsl))",
                                    backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    margin: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.2rem"
                                  }}>
                                    <Edit2 size={10} /> Replace
                                    <input
                                      type="file"
                                      accept=".pdf,.ai,.eps,.psd,.tiff,.tif,.png,.jpg,.jpeg"
                                      disabled={uploadingArtworkIdx !== null}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                          handleAdminArtworkUpload(selectedOrder.id, idx, f, file.side || (fIdx === 0 ? "front" : "back"));
                                        }
                                        e.target.value = "";
                                      }}
                                      style={{ display: "none" }}
                                    />
                                  </label>

                                  {/* Delete file */}
                                  <button
                                    type="button"
                                    onClick={() => handleAdminRemoveArtworkFile(selectedOrder.id, idx, fIdx)}
                                    disabled={uploadingArtworkIdx !== null}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#EF4444",
                                      cursor: "pointer",
                                      padding: "0.2rem",
                                      display: "flex",
                                      alignItems: "center"
                                    }}
                                    title="Delete file"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", fontStyle: "italic" }}>
                            No customer artwork attached yet. You can attach a print-ready file above before transmitting to SinaLite.
                          </div>
                        )}

                        {artworkStatusMsg && uploadingArtworkIdx === idx && (
                          <span style={{ fontSize: "0.72rem", color: "hsl(var(--accent-hsl))", fontWeight: 600 }}>
                            {artworkStatusMsg}
                          </span>
                        )}
                      </div>

                      {/* Item-level SinaLite Digital Proof Link */}
                      {(item.reviewURL || item.reviewFILE) && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <a
                            href={item.reviewURL || item.reviewFILE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", backgroundColor: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" }}
                          >
                            <Printer size={12} /> Inspect Item Digital Proof <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      {/* Custom Apparel Sizing Breakdown & Details */}
                      {Boolean(item.isApparel && (item.sizeBreakdown || item.printLocation || item.color)) && (
                        <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.75rem", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {item.color && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                              <span style={{ color: "#64748B", fontWeight: 700 }}>Color:</span>
                              <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: item.color.hex || "#FFFFFF", border: "1px solid rgba(0,0,0,0.2)" }} />
                              <span style={{ fontWeight: 700 }}>{item.color.name}</span>
                            </div>
                          )}

                          {item.sizeBreakdown && Object.keys(item.sizeBreakdown).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", fontSize: "0.75rem" }}>
                              <span style={{ color: "#64748B", fontWeight: 700 }}>Sizes:</span>
                              {Object.entries(item.sizeBreakdown).filter(([_, q]) => q > 0).map(([sName, sQty]) => (
                                <span key={sName} style={{ padding: "0.15rem 0.45rem", backgroundColor: "#EFF6FF", color: "#1D4ED8", borderRadius: "4px", fontWeight: 800, border: "1px solid #BFDBFE" }}>
                                  {sName}: {sQty} pcs
                                </span>
                              ))}
                            </div>
                          )}

                          {item.printLocation && (
                            <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                              <span style={{ color: "#64748B", fontWeight: 700 }}>Print Location:</span> {item.printLocation.label || item.printLocation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mockup Preview for Custom Apparel */}
                      {Boolean(item.isApparel && (item.garmentViews || item.apparelViews)) && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <AdminApparelMockupRender item={item} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Totals */}
              <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal:</span>
                  <span>${parseFloat(selectedOrder.totals?.subtotal || 0).toFixed(2)} CAD</span>
                </div>
                {(selectedOrder.promoCode || parseFloat(selectedOrder.totals?.discount || 0) > 0) && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#16A34A", fontWeight: 700 }}>
                    <span>Discount ({selectedOrder.promoCode?.code || "Promo Code"}):</span>
                    <span>-${parseFloat(selectedOrder.totals?.discount || selectedOrder.promoCode?.discountAmount || 0).toFixed(2)} CAD</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Shipping:</span>
                  <span>${parseFloat(selectedOrder.totals?.shipping || 0).toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tax:</span>
                  <span>${parseFloat(selectedOrder.totals?.tax || 0).toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "hsl(var(--accent-hsl))", borderTop: "1px dashed hsl(var(--border-hsl))", paddingTop: "0.25rem" }}>
                  <span>Grand Total:</span>
                  <span>${parseFloat(selectedOrder.totals?.grandTotal || 0).toFixed(2)} CAD</span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Email to Customer Modal */}
          {emailModalOpen && selectedOrder && (
            <div style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem"
            }}>
              <div style={{
                backgroundColor: "hsl(var(--card-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                borderRadius: "var(--radius-lg, 12px)",
                maxWidth: "560px",
                width: "100%",
                padding: "1.5rem",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Mail size={18} /> Send Customer Email
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "hsl(var(--muted-hsl))" }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
                  This email will be delivered to <strong>{selectedOrder.shippingAddress?.ShipEmail || selectedOrder.shippingAddress?.email || selectedOrder.userEmail || "Customer"}</strong> with the official Apex Workwear &amp; Print branded header and footer.
                </p>

                <div>
                  <label className="label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Subject Line</label>
                  <input
                    type="text"
                    className="input"
                    value={customEmailSubject}
                    onChange={(e) => setCustomEmailSubject(e.target.value)}
                    placeholder="Subject"
                    style={{ width: "100%", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Message Content</label>
                  <textarea
                    className="input"
                    rows={6}
                    value={customEmailMessage}
                    onChange={(e) => setCustomEmailMessage(e.target.value)}
                    placeholder="Write your email body here... Newlines are formatted into paragraphs."
                    style={{ width: "100%", fontSize: "0.9rem", resize: "vertical" }}
                  />
                </div>

                {customEmailStatus && (
                  <div style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: customEmailStatus.includes("success") ? "#D1FAE5" : "#FEE2E2",
                    color: customEmailStatus.includes("success") ? "#065F46" : "#991B1B"
                  }}>
                    {customEmailStatus}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="btn btn-outline"
                    disabled={sendingCustomEmail}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCustomEmail}
                    className="btn btn-primary"
                    disabled={sendingCustomEmail}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {sendingCustomEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {sendingCustomEmail ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Abandoned Checkout Recovery Offer Modal */}
          {recoveryModalOrder && (
            <div style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem"
            }}>
              <div style={{
                backgroundColor: "hsl(var(--card-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                borderRadius: "var(--radius-lg, 12px)",
                maxWidth: "600px",
                width: "100%",
                padding: "1.5rem",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", color: "#0F172A" }}>
                    <Mail size={18} style={{ color: "#0284C7" }} /> Abandoned Checkout Recovery
                  </h3>
                  <button
                    type="button"
                    onClick={() => setRecoveryModalOrder(null)}
                    style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "hsl(var(--muted-hsl))" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.82rem", color: "#475569" }}>
                  <div>Sending to: <strong style={{ color: "#0F172A" }}>{recoveryModalOrder.shippingAddress?.ShipEmail || recoveryModalOrder.shippingAddress?.email || recoveryModalOrder.userEmail || "Customer"}</strong></div>
                  <div>Customer: <strong style={{ color: "#0F172A" }}>{recoveryModalOrder.shippingAddress?.ShipFName} {recoveryModalOrder.shippingAddress?.ShipLName || ""}</strong></div>
                  <div>Checkout ID: <code style={{ backgroundColor: "#E2E8F0", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>#{recoveryModalOrder.id.slice(0, 10)}</code></div>
                </div>

                {/* Pre-made Template Selector */}
                <div>
                  <label className="label" style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    Select Pre-Made Offer Template
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                    {[
                      { id: "discount_10", label: "10% Discount", icon: "🏷️", code: "SAVE10", subject: "Take 10% Off Your Pending Order - Apex Workwear" },
                      { id: "free_shipping", label: "Free Shipping", icon: "🚚", code: "FREESHIP", subject: "Free Standard Shipping on Your Order - Apex Workwear" },
                      { id: "support", label: "Order Assistance", icon: "💬", code: "", subject: "Can we help you with your order? - Apex Workwear" },
                    ].map(tpl => {
                      const isSel = recoveryTemplate === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setRecoveryTemplate(tpl.id);
                            setRecoveryDiscountCode(tpl.code);
                            setRecoverySubject(tpl.subject);
                          }}
                          style={{
                            padding: "0.6rem 0.5rem",
                            borderRadius: "8px",
                            border: isSel ? "2px solid #0284C7" : "1px solid #CBD5E1",
                            backgroundColor: isSel ? "#EFF6FF" : "#FFFFFF",
                            textAlign: "center",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.2rem"
                          }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>{tpl.icon}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isSel ? "#0369A1" : "#1E293B" }}>{tpl.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Promo Code Input (if applicable) */}
                {recoveryTemplate !== "support" && (
                  <div>
                    <label className="label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Promo Code Included in Email</label>
                    <input
                      type="text"
                      className="input"
                      value={recoveryDiscountCode}
                      onChange={(e) => setRecoveryDiscountCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SAVE10"
                      style={{ width: "100%", fontSize: "0.88rem", fontWeight: 800, letterSpacing: "1px" }}
                    />
                  </div>
                )}

                {/* Subject Line */}
                <div>
                  <label className="label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Subject Line</label>
                  <input
                    type="text"
                    className="input"
                    value={recoverySubject}
                    onChange={(e) => setRecoverySubject(e.target.value)}
                    placeholder="Subject line"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>

                {/* Optional Custom Note */}
                <div>
                  <label className="label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                    Optional Custom Note from Admin (Appended inside branded body)
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={recoveryCustomMessage}
                    onChange={(e) => setRecoveryCustomMessage(e.target.value)}
                    placeholder="e.g. Hi Ash, we checked your card artwork and the resolution looks sharp! Let us know if you need help finalizing."
                    style={{ width: "100%", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>

                {recoveryStatusMsg && (
                  <div style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: recoveryStatusMsg.includes("success") ? "#D1FAE5" : "#FEE2E2",
                    color: recoveryStatusMsg.includes("success") ? "#065F46" : "#991B1B"
                  }}>
                    {recoveryStatusMsg}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => setRecoveryModalOrder(null)}
                    className="btn btn-outline"
                    disabled={sendingRecovery}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendRecoveryEmail}
                    className="btn btn-primary"
                    disabled={sendingRecovery}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#0284C7", borderColor: "#0369A1", color: "white" }}
                  >
                    {sendingRecovery ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {sendingRecovery ? "Delivering..." : "Send Recovery Email"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminApparelMockupRender({ item }) {
  const snapshots = item.mockupSnapshots || {};
  const placementMeta = item.placementMetadata || {};
  const artworkFiles = item.artworkFiles || [];

  const sides = Object.keys(snapshots).length > 0
    ? Object.keys(snapshots)
    : ["front"];

  return (
    <div style={{
      backgroundColor: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      padding: "0.85rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563EB", textTransform: "uppercase" }}>
          👕 Visual Placement Mockups & Specs
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>
          {artworkFiles.length} Logo Attachment(s)
        </span>
      </div>

      {/* Grid of side mockups */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: "0.75rem" }}>
        {sides.map((side) => {
          const snapshotUrl = snapshots[side] || item.images?.[0];
          const meta = placementMeta[side];
          const sideArtwork = artworkFiles.find(a => a.side === side) || artworkFiles[0];

          return (
            <div key={side} style={{ backgroundColor: "#FFFFFF", borderRadius: "6px", border: "1px solid #CBD5E1", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#0F172A", textTransform: "capitalize" }}>
                  {side} Side Placement
                </span>
                {meta && (
                  <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 600 }}>
                    X: {Math.round(meta.positionX)}% • Y: {Math.round(meta.positionY)}%
                  </span>
                )}
              </div>

              {snapshotUrl && (
                <div style={{ width: "100%", height: "160px", backgroundColor: "#F8FAFC", borderRadius: "4px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={snapshotUrl}
                    alt={`${side} Mockup`}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              )}

              {sideArtwork?.url && (
                <a
                  href={sideArtwork.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", textDecoration: "none", color: "#2563EB", borderColor: "#BFDBFE" }}
                >
                  <FileText size={12} /> Download Raw {side.toUpperCase()} Logo
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading order dashboard...
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}
