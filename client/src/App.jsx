import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/items";

const SWAP_API_URL = API_URL.replace(/\/items\/?$/, "/swaps");

const EMPTY_ITEM = {
  title: "",
  category: "",
  description: "",
  size: "",
  condition: "Good",
  exchangeType: "Swap",
  ownerName: "",
  ownerEmail: "",
  imageUrl: "",
};

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [exchangeType, setExchangeType] = useState("All");

  const [showAddForm, setShowAddForm] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formError, setFormError] = useState("");
  const [newItem, setNewItem] = useState(EMPTY_ITEM);

  // RECEIVED REQUESTS
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsEmail, setRequestsEmail] = useState("");

  // --------------------------------------------------
  // FETCH CLOTHING ITEMS
  // --------------------------------------------------

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to load items (${response.status}).`
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const availableItems = list.filter(
        (item) =>
          String(item.status || "Available").toLowerCase() !== "exchanged"
      );

      setItems(availableItems);

      console.log("Items received from backend:", list);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load clothing items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const categories = useMemo(
    () => [
      "All",
      ...new Set(items.map((item) => item.category).filter(Boolean)),
    ],
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.title,
          item.description,
          item.category,
          item.ownerName,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      const matchesCategory =
        category === "All" ||
        String(item.category || "").toLowerCase() ===
          category.toLowerCase();

      const matchesExchange =
        exchangeType === "All" ||
        String(item.exchangeType || "").toLowerCase() ===
          exchangeType.toLowerCase();

      const available =
        String(item.status || "Available").toLowerCase() !== "exchanged";

      return (
        matchesSearch &&
        matchesCategory &&
        matchesExchange &&
        available
      );
    });
  }, [items, search, category, exchangeType]);

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const updateField = (field, value) => {
    setNewItem((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const closeForm = () => {
    if (savingItem) return;

    setShowAddForm(false);
    setFormError("");
    setEditingItemId(null);
    setNewItem(EMPTY_ITEM);
  };

  // --------------------------------------------------
  // ADD / EDIT ITEM
  // --------------------------------------------------

  const handleAddItem = async (event) => {
    event.preventDefault();
    setFormError("");

    if (
      !newItem.title.trim() ||
      !newItem.category ||
      !newItem.description.trim() ||
      !newItem.size ||
      !newItem.ownerName.trim() ||
      !newItem.ownerEmail.trim()
    ) {
      setFormError(
        "Please fill in all required fields, including your email."
      );
      return;
    }

    try {
      setSavingItem(true);

      const payload = {
        ...newItem,
        title: newItem.title.trim(),
        description: newItem.description.trim(),
        ownerName: newItem.ownerName.trim(),
        ownerEmail: newItem.ownerEmail.trim().toLowerCase(),
        imageUrl: newItem.imageUrl.trim(),
        status: "Available",
      };

      const isEditing = Boolean(editingItemId);

      const response = await fetch(
        isEditing
          ? `${API_URL}/${editingItemId}`
          : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to save clothing item."
        );
      }

      setNewItem(EMPTY_ITEM);
      setEditingItemId(null);
      setShowAddForm(false);

      await fetchItems();

      window.alert(
        isEditing
          ? "Clothing item updated successfully!"
          : "Clothing item added successfully!"
      );
    } catch (err) {
      console.error(err);
      setFormError(
        err.message || "Something went wrong while saving the item."
      );
    } finally {
      setSavingItem(false);
    }
  };

  // --------------------------------------------------
  // SEND SWAP REQUEST
  // --------------------------------------------------

  const handleSwap = async (targetItem) => {
    if (!targetItem?._id) {
      window.alert(
        "This clothing item does not have a valid ID."
      );
      return;
    }

    const requesterEmailInput = window.prompt(
      "Enter the email address used when you listed your clothing item:"
    );

    if (requesterEmailInput === null) return;

    const requesterEmail =
      requesterEmailInput.trim().toLowerCase();

    if (!requesterEmail) {
      window.alert("Please enter your email address.");
      return;
    }

    if (
      requesterEmail ===
      String(targetItem.ownerEmail || "").toLowerCase()
    ) {
      window.alert("You cannot request your own clothing item.");
      return;
    }

    const mySwapItems = items.filter(
      (item) =>
        item._id &&
        String(item.ownerEmail || "").toLowerCase() ===
          requesterEmail &&
        String(item.exchangeType || "").toLowerCase() ===
          "swap" &&
        String(item.status || "available").toLowerCase() !==
          "exchanged" &&
        item._id !== targetItem._id
    );

    if (mySwapItems.length === 0) {
      window.alert(
        "No available Swap item was found for this email. Add your own clothing item with the same email first, then try again."
      );
      return;
    }

    const choices = mySwapItems
      .map(
        (item, index) =>
          `${index + 1}. ${item.title} (Size: ${
            item.size || "—"
          })`
      )
      .join("\n");

    const selected = window.prompt(
      `Choose the number of your item to offer for "${targetItem.title}":\n\n${choices}\n\nEnter a number:`
    );

    if (selected === null) return;

    const selectedIndex = Number(selected) - 1;

    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= mySwapItems.length
    ) {
      window.alert("Please enter a valid item number.");
      return;
    }

    const offeredItem = mySwapItems[selectedIndex];

    try {
      const response = await fetch(SWAP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterItem: offeredItem._id,
          requestedItem: targetItem._id,
          requesterEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to send swap request."
        );
      }

      window.alert(
        data.message ||
          `Swap request sent for "${targetItem.title}" successfully!`
      );
    } catch (err) {
      console.error(err);
      window.alert(
        err.message ||
          "Something went wrong while sending the swap request."
      );
    }
  };

  // --------------------------------------------------
  // VIEW RECEIVED REQUESTS
  // --------------------------------------------------

  const handleViewRequests = async () => {
    const emailInput = window.prompt(
      "Enter your email to view received swap requests:"
    );

    if (emailInput === null) return;

    const email = emailInput.trim().toLowerCase();

    if (!email) {
      window.alert("Please enter your email address.");
      return;
    }

    try {
      setRequestsLoading(true);
      setRequestsEmail(email);

      const response = await fetch(
        `${SWAP_API_URL}/received?ownerEmail=${encodeURIComponent(
          email
        )}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load swap requests."
        );
      }

      setReceivedRequests(data.requests || []);
      setShowRequests(true);
    } catch (err) {
      console.error(err);
      window.alert(
        err.message || "Something went wrong while loading requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // --------------------------------------------------
  // ACCEPT REQUEST
  // --------------------------------------------------

  const handleAcceptRequest = async (request) => {
    if (!request?._id) {
      window.alert("Invalid swap request ID.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to accept this swap request?"
    );

    if (!confirmed) return;

    try {
      setRequestsLoading(true);

      const response = await fetch(
        `${SWAP_API_URL}/${request._id}/accept`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerEmail: requestsEmail,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to accept swap request."
        );
      }

      window.alert(
        data.message ||
          "Swap accepted successfully. Both items are now exchanged."
      );

      // Reload clothing items so exchanged items disappear
      await fetchItems();

      // Reload received requests
      await loadRequestsForEmail(requestsEmail);
    } catch (err) {
      console.error(err);
      window.alert(
        err.message ||
          "Something went wrong while accepting the request."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // --------------------------------------------------
  // REJECT REQUEST
  // --------------------------------------------------

  const handleRejectRequest = async (request) => {
    if (!request?._id) {
      window.alert("Invalid swap request ID.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this swap request?"
    );

    if (!confirmed) return;

    try {
      setRequestsLoading(true);

      const response = await fetch(
        `${SWAP_API_URL}/${request._id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerEmail: requestsEmail,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to reject swap request."
        );
      }

      window.alert(
        data.message || "Swap request rejected successfully."
      );

      await loadRequestsForEmail(requestsEmail);
    } catch (err) {
      console.error(err);
      window.alert(
        err.message ||
          "Something went wrong while rejecting the request."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // --------------------------------------------------
  // RELOAD REQUESTS
  // --------------------------------------------------

  const loadRequestsForEmail = async (email) => {
    if (!email) return;

    try {
      const response = await fetch(
        `${SWAP_API_URL}/received?ownerEmail=${encodeURIComponent(
          email
        )}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to reload requests."
        );
      }

      setReceivedRequests(data.requests || []);
      setShowRequests(true);
    } catch (err) {
      console.error(err);
      window.alert(
        err.message || "Unable to reload swap requests."
      );
    }
  };

  // --------------------------------------------------
  // EDIT ITEM
  // --------------------------------------------------

  const handleEditItem = async (item) => {
    const updatedTitle = window.prompt(
      "Enter new clothing title:",
      item.title
    );

    if (
      updatedTitle === null ||
      !updatedTitle.trim()
    ) {
      return;
    }

    const updatedDescription = window.prompt(
      "Enter new description:",
      item.description
    );

    if (
      updatedDescription === null ||
      !updatedDescription.trim()
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${item._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: updatedTitle.trim(),
            description: updatedDescription.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to update item."
        );
      }

      await fetchItems();

      window.alert(
        "Clothing item updated successfully!"
      );
    } catch (error) {
      console.error(error);
      window.alert(error.message);
    }
  };

  // --------------------------------------------------
  // DELETE ITEM
  // --------------------------------------------------

  const handleDeleteItem = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/${item._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to delete item."
        );
      }

      await fetchItems();

      window.alert(
        "Clothing item deleted successfully!"
      );
    } catch (error) {
      console.error(error);
      window.alert(error.message);
    }
  };

  // --------------------------------------------------
  // REQUEST DISPLAY HELPERS
  // --------------------------------------------------

  const getItemTitle = (item) => {
    if (!item) return "Unknown item";

    if (typeof item === "object") {
      return item.title || "Unknown item";
    }

    return String(item);
  };

  const getItemSize = (item) => {
    if (!item) return "—";

    if (typeof item === "object") {
      return item.size || "—";
    }

    return "—";
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="marketplace">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #faf9f6;
          color: #26352c;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 7%;
          background: white;
          border-bottom: 1px solid #eee;
          flex-wrap: wrap;
          gap: 15px;
        }

        .brand {
          font-size: 24px;
          font-weight: 800;
          color: #246b45;
        }

        .brand span {
          color: #c48a45;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 25px;
          color: #536257;
          font-size: 14px;
        }

        .nav-links a {
          text-decoration: none;
          color: inherit;
        }

        .nav-links a:hover {
          color: #246b45;
        }

        .hero {
          background: linear-gradient(120deg, #e8f1e7, #f7efe1);
          padding: 75px 8%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
          flex-wrap: wrap;
        }

        .hero-content {
          max-width: 650px;
        }

        .eyebrow {
          color: #38734e;
          font-weight: bold;
          font-size: 13px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .hero h1 {
          font-size: clamp(35px, 5vw, 58px);
          line-height: 1.12;
          margin: 18px 0;
          color: #244b35;
        }

        .hero p {
          color: #667469;
          font-size: 17px;
          line-height: 1.7;
          max-width: 520px;
        }

        .hero-button {
          display: inline-block;
          background: #286b45;
          color: white;
          padding: 14px 25px;
          border-radius: 7px;
          text-decoration: none;
          margin-top: 15px;
          font-weight: bold;
        }

        .hero-art {
          font-size: 115px;
          text-align: center;
          padding: 25px;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 30px 7%;
          background: white;
        }

        .feature {
          text-align: center;
          padding: 15px;
        }

        .feature-icon {
          font-size: 30px;
        }

        .feature h3 {
          margin: 10px 0 5px;
          font-size: 16px;
        }

        .feature p {
          margin: 0;
          color: #7a847d;
          font-size: 13px;
        }

        .section {
          padding: 55px 7%;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 25px;
        }

        .section-heading h2 {
          font-size: 30px;
          margin: 0 0 8px;
          color: #244b35;
        }

        .section-heading p {
          margin: 0;
          color: #788279;
        }

        .collection-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .add-button,
        .save-button {
          background: #286b45;
          border: 1px solid #286b45;
          color: white;
          border-radius: 7px;
          padding: 11px 16px;
          cursor: pointer;
          font-weight: bold;
        }

        .add-button:hover,
        .save-button:hover {
          background: #194e31;
        }

        .refresh-button {
          background: white;
          border: 1px solid #d5dfd6;
          color: #286b45;
          border-radius: 7px;
          padding: 10px 16px;
          cursor: pointer;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .requests-button {
          display: block;
          margin: 0 auto 25px;
          background: #286b45;
          border: none;
          color: white;
          padding: 12px 20px;
          border-radius: 7px;
          font-weight: bold;
        }

        .requests-button:disabled {
          opacity: 0.6;
        }

        .requests-panel {
          background: white;
          border: 1px solid #dfe8df;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 5px 18px rgba(36, 75, 53, 0.07);
        }

        .requests-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .requests-header h2 {
          margin: 0;
          color: #244b35;
        }

        .requests-email {
          color: #718075;
          font-size: 13px;
        }

        .request-card {
          border: 1px solid #e1e9e2;
          border-radius: 10px;
          padding: 18px;
          margin-bottom: 15px;
          background: #fbfcfa;
        }

        .request-card:last-child {
          margin-bottom: 0;
        }

        .request-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .request-number {
          font-weight: bold;
          color: #244b35;
        }

        .request-status {
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          background: #f0e8d8;
          color: #8a6532;
        }

        .request-status.accepted {
          background: #dff2e4;
          color: #247344;
        }

        .request-status.rejected {
          background: #f8dddd;
          color: #a23d3d;
        }

        .request-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .request-item-box {
          background: white;
          border: 1px solid #e7ece7;
          border-radius: 8px;
          padding: 15px;
        }

        .request-item-box h4 {
          margin: 0 0 8px;
          color: #a4773c;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .request-item-box strong {
          color: #2d4636;
        }

        .request-item-box p {
          margin: 6px 0 0;
          color: #718075;
          font-size: 13px;
        }

        .request-from {
          margin: 15px 0;
          color: #59685e;
          font-size: 13px;
        }

        .request-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .accept-button {
          background: #286b45;
          border: 1px solid #286b45;
          color: white;
          padding: 9px 16px;
          border-radius: 6px;
        }

        .reject-button {
          background: white;
          border: 1px solid #c95c5c;
          color: #a23d3d;
          padding: 9px 16px;
          border-radius: 6px;
        }

        .request-empty {
          text-align: center;
          padding: 25px;
          color: #718075;
          background: #fafcf9;
          border-radius: 8px;
        }

        .filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .search-input,
        .filter-select {
          padding: 13px 15px;
          border: 1px solid #dce3dc;
          border-radius: 7px;
          background: white;
          outline: none;
          color: #35463a;
        }

        .search-input {
          flex: 1;
          min-width: 220px;
        }

        .filter-select {
          min-width: 150px;
        }

        .search-input:focus,
        .filter-select:focus {
          border-color: #43865b;
        }

        .item-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(245px, 1fr)
          );
          gap: 24px;
        }

        .item-card {
          background: white;
          border: 1px solid #e9eee9;
          border-radius: 12px;
          overflow: hidden;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .item-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(36, 75, 53, 0.09);
        }

        .item-image {
          height: 220px;
          background: #edf2ec;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          font-size: 75px;
        }

        .item-badge {
          position: absolute;
          top: 13px;
          left: 13px;
          background: #286b45;
          color: white;
          padding: 6px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
        }

        .item-details {
          padding: 18px;
        }

        .item-category {
          color: #a4773c;
          font-size: 12px;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .item-details h3 {
          margin: 9px 0;
          font-size: 19px;
          color: #2d4636;
        }

        .item-description {
          color: #778179;
          font-size: 13px;
          line-height: 1.5;
          min-height: 40px;
        }

        .item-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin: 15px 0;
          font-size: 12px;
          color: #637166;
        }

        .item-meta span {
          background: #f3f6f1;
          padding: 6px 9px;
          border-radius: 5px;
        }

        .owner {
          border-top: 1px solid #edf0ed;
          padding-top: 12px;
          font-size: 12px;
          color: #778179;
        }

        .item-actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }

        .item-actions button {
          flex: 1;
          padding: 8px 5px;
          border: 1px solid #d5ddd5;
          background: white;
          color: #35463a;
          border-radius: 5px;
        }

        .item-actions button:hover {
          background: #f1f5f0;
        }

        .empty,
        .loading,
        .error {
          text-align: center;
          padding: 45px 15px;
          background: white;
          border-radius: 10px;
          color: #718075;
        }

        .empty-icon {
          font-size: 45px;
        }

        .error {
          color: #b43e3e;
        }

        .footer {
          background: #244b35;
          color: white;
          padding: 35px 7%;
          text-align: center;
        }

        .footer p {
          color: #d1dfd4;
          font-size: 13px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20, 35, 25, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          overflow-y: auto;
        }

        .add-modal {
          width: 100%;
          max-width: 700px;
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 14px;
          padding: 25px;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.2);
        }

        .modal-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .modal-heading h2 {
          margin: 0;
          color: #244b35;
        }

        .close-modal {
          border: 0;
          background: #f1f5f0;
          border-radius: 7px;
          padding: 7px 12px;
          cursor: pointer;
          font-size: 20px;
        }

        .add-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .form-field.full {
          grid-column: 1 / -1;
        }

        .form-field label {
          color: #405448;
          font-size: 14px;
          font-weight: bold;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #dce3dc;
          border-radius: 7px;
          color: #35463a;
          background: white;
        }

        .form-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-error {
          grid-column: 1 / -1;
          color: #b43e3e;
          margin: 0;
        }

        .form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 5px;
        }

        .cancel-button {
          background: #f1f5f0;
          border: 1px solid #dce3dc;
          color: #405448;
          border-radius: 7px;
          padding: 11px 16px;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 650px) {
          .navbar {
            padding: 18px 5%;
          }

          .nav-links {
            gap: 13px;
            font-size: 12px;
          }

          .hero {
            padding: 50px 6%;
          }

          .hero-art {
            font-size: 75px;
            padding: 5px;
          }

          .features {
            grid-template-columns: 1fr;
          }

          .section {
            padding: 40px 5%;
          }

          .item-grid {
            grid-template-columns: 1fr;
          }

          .request-details {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .add-form {
            grid-template-columns: 1fr;
          }

          .form-field.full {
            grid-column: auto;
          }
        }
      `}</style>

      {/* NAVBAR */}

      <nav className="navbar">
        <div className="brand">
          ReWear<span>.</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#collection">Browse Clothes</a>
          <a href="#about">About Us</a>
        </div>
      </nav>

      {/* HERO */}

      <section className="hero" id="home">
        <div className="hero-content">
          <div className="eyebrow">
            Fashion with a second chance
          </div>

          <h1>
            Give Your Clothes
            <br />
            A New Story.
          </h1>

          <p>
            Exchange, reuse and donate clothes you no longer
            need. Discover pre-loved fashion and make
            sustainable choices one outfit at a time.
          </p>

          <a
            href="#collection"
            className="hero-button"
          >
            Explore Collection →
          </a>
        </div>

        <div className="hero-art">
          👗 ♻️ 👕
        </div>
      </section>

      {/* FEATURES */}

      <section className="features" id="about">
        <div className="feature">
          <div className="feature-icon">♻️</div>
          <h3>Sustainable Fashion</h3>
          <p>Reduce clothing waste through reuse.</p>
        </div>

        <div className="feature">
          <div className="feature-icon">🤝</div>
          <h3>Easy Clothing Swaps</h3>
          <p>Give and receive clothes through exchange.</p>
        </div>

        <div className="feature">
          <div className="feature-icon">💚</div>
          <h3>Support Others</h3>
          <p>Donate wearable clothes to others.</p>
        </div>
      </section>

      {/* COLLECTION */}

      <section className="section" id="collection">
        <div className="section-heading">
          <div>
            <h2>Explore Clothing</h2>
            <p>
              Discover clothes available in our community.
            </p>
          </div>

          <div className="collection-actions">
            <button
              className="add-button"
              onClick={() => {
                setFormError("");
                setEditingItemId(null);
                setNewItem(EMPTY_ITEM);
                setShowAddForm(true);
              }}
            >
              + Add Clothing
            </button>

            <button
              className="refresh-button"
              onClick={fetchItems}
              disabled={loading}
            >
              ↻{" "}
              {loading
                ? "Loading..."
                : "Refresh Items"}
            </button>
          </div>
        </div>

        {/* VIEW REQUESTS BUTTON */}

        <button
          type="button"
          className="requests-button"
          onClick={handleViewRequests}
          disabled={requestsLoading}
        >
          {requestsLoading
            ? "Loading Requests..."
            : "View Requests"}
        </button>

        {/* RECEIVED REQUESTS */}

        {showRequests && (
          <div className="requests-panel">
            <div className="requests-header">
              <div>
                <h2>Received Swap Requests</h2>

                <div className="requests-email">
                  Requests for: {requestsEmail}
                </div>
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={() =>
                  loadRequestsForEmail(requestsEmail)
                }
                disabled={requestsLoading}
              >
                ↻ Refresh Requests
              </button>
            </div>

            {requestsLoading ? (
              <div className="request-empty">
                Loading requests...
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="request-empty">
                No swap requests found for this email.
              </div>
            ) : (
              receivedRequests.map((request, index) => {
                const requesterItem =
                  request.requesterItem;

                const requestedItem =
                  request.requestedItem;

                const status =
                  request.status || "Pending";

                const statusClass =
                  status.toLowerCase();

                return (
                  <div
                    className="request-card"
                    key={
                      request._id ||
                      `${request.requesterEmail}-${index}`
                    }
                  >
                    <div className="request-top">
                      <div className="request-number">
                        Request #{index + 1}
                      </div>

                      <div
                        className={`request-status ${statusClass}`}
                      >
                        {status}
                      </div>
                    </div>

                    <div className="request-details">
                      <div className="request-item-box">
                        <h4>They offer</h4>

                        <strong>
                          {getItemTitle(requesterItem)}
                        </strong>

                        <p>
                          Size:{" "}
                          {getItemSize(requesterItem)}
                        </p>
                      </div>

                      <div className="request-item-box">
                        <h4>They want</h4>

                        <strong>
                          {getItemTitle(requestedItem)}
                        </strong>

                        <p>
                          Size:{" "}
                          {getItemSize(requestedItem)}
                        </p>
                      </div>
                    </div>

                    <div className="request-from">
                      <strong>Requester:</strong>{" "}
                      {request.requesterEmail ||
                        "Unknown email"}
                    </div>

                    {status.toLowerCase() ===
                      "pending" && (
                      <div className="request-actions">
                        <button
                          type="button"
                          className="accept-button"
                          onClick={() =>
                            handleAcceptRequest(request)
                          }
                          disabled={requestsLoading}
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          className="reject-button"
                          onClick={() =>
                            handleRejectRequest(request)
                          }
                          disabled={requestsLoading}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* FILTERS */}

        <div className="filters">
          <input
            className="search-input"
            type="text"
            placeholder="Search clothes, categories..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <select
            className="filter-select"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            {categories.map((cat) => (
              <option
                key={cat}
                value={cat}
              >
                {cat === "All"
                  ? "All Categories"
                  : cat}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={exchangeType}
            onChange={(e) =>
              setExchangeType(e.target.value)
            }
          >
            <option value="All">
              All Types
            </option>

            <option value="Swap">
              Swap
            </option>

            <option value="Donate">
              Donate
            </option>
          </select>
        </div>

        {/* ADD / EDIT MODAL */}

        {showAddForm && (
          <div
            className="modal-backdrop"
            onClick={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeForm();
              }
            }}
          >
            <div
              className="add-modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-heading">
                <h2>
                  {editingItemId
                    ? "Edit Clothing"
                    : "Add Clothing"}
                </h2>

                <button
                  type="button"
                  className="close-modal"
                  onClick={closeForm}
                  disabled={savingItem}
                >
                  ×
                </button>
              </div>

              <form
                className="add-form"
                onSubmit={handleAddItem}
              >
                <div className="form-field full">
                  <label htmlFor="item-title">
                    Clothing name *
                  </label>

                  <input
                    id="item-title"
                    value={newItem.title}
                    required
                    placeholder="e.g. Blue Denim Jacket"
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="item-category">
                    Category *
                  </label>

                  <select
                    id="item-category"
                    value={newItem.category}
                    required
                    onChange={(e) =>
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select category
                    </option>

                    {[
                      "T-Shirts",
                      "Shirts",
                      "Jackets",
                      "Dresses",
                      "Jeans",
                      "Trousers",
                      "Traditional Wear",
                      "Other",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="item-size">
                    Size *
                  </label>

                  <select
                    id="item-size"
                    value={newItem.size}
                    required
                    onChange={(e) =>
                      updateField(
                        "size",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select size
                    </option>

                    {[
                      "XS",
                      "S",
                      "M",
                      "L",
                      "XL",
                      "XXL",
                      "Free Size",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="item-condition">
                    Condition *
                  </label>

                  <select
                    id="item-condition"
                    value={newItem.condition}
                    required
                    onChange={(e) =>
                      updateField(
                        "condition",
                        e.target.value
                      )
                    }
                  >
                    {[
                      "Excellent",
                      "Good",
                      "Fair",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="item-type">
                    Listing type *
                  </label>

                  <select
                    id="item-type"
                    value={newItem.exchangeType}
                    required
                    onChange={(e) =>
                      updateField(
                        "exchangeType",
                        e.target.value
                      )
                    }
                  >
                    <option value="Swap">
                      Swap
                    </option>

                    <option value="Donate">
                      Donate
                    </option>
                  </select>
                </div>

                <div className="form-field full">
                  <label htmlFor="item-description">
                    Description *
                  </label>

                  <textarea
                    id="item-description"
                    value={newItem.description}
                    required
                    placeholder="Describe the clothing item..."
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="item-owner">
                    Your name *
                  </label>

                  <input
                    id="item-owner"
                    value={newItem.ownerName}
                    required
                    placeholder="Enter your name"
                    onChange={(e) =>
                      updateField(
                        "ownerName",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="item-email">
                    Your email *
                  </label>

                  <input
                    id="item-email"
                    type="email"
                    value={newItem.ownerEmail}
                    required
                    placeholder="Enter your email"
                    onChange={(e) =>
                      updateField(
                        "ownerEmail",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field full">
                  <label htmlFor="item-image">
                    Image URL (optional)
                  </label>

                  <input
                    id="item-image"
                    type="url"
                    value={newItem.imageUrl}
                    placeholder="https://..."
                    onChange={(e) =>
                      updateField(
                        "imageUrl",
                        e.target.value
                      )
                    }
                  />
                </div>

                {formError && (
                  <p className="form-error">
                    {formError}
                  </p>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    disabled={savingItem}
                    onClick={closeForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                    disabled={savingItem}
                  >
                    {savingItem
                      ? "Saving..."
                      : editingItemId
                      ? "Update Clothing"
                      : "Add Clothing"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CLOTHING LIST */}

        {loading ? (
          <div className="loading">
            <h3>
              Loading clothing items...
            </h3>

            <p>
              Connecting to our marketplace.
            </p>
          </div>
        ) : error ? (
          <div className="error">
            <h3>
              Unable to load items
            </h3>

            <p>{error}</p>

            <button
              className="refresh-button"
              onClick={fetchItems}
            >
              Try Again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              👕
            </div>

            <h3>
              No clothing items found
            </h3>

            <p>
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="item-grid">
            {filteredItems.map((item) => (
              <div
                className="item-card"
                key={item._id || item.id}
              >
                <div className="item-image">
                  {item.imageUrl ||
                  item.image ? (
                    <img
                      src={
                        item.imageUrl ||
                        item.image
                      }
                      alt={
                        item.title ||
                        "Clothing item"
                      }
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="placeholder">
                      👕
                    </div>
                  )}

                  <span className="item-badge">
                    {item.exchangeType ||
                      "Swap"}
                  </span>
                </div>

                <div className="item-details">
                  <div className="item-category">
                    {item.category}
                  </div>

                  <h3>
                    {item.title}
                  </h3>

                  <p className="item-description">
                    {item.description}
                  </p>

                  <div className="item-meta">
                    <span>
                      Size:{" "}
                      {item.size || "—"}
                    </span>

                    <span>
                      {item.condition ||
                        "Good"}
                    </span>
                  </div>

                  <div className="owner">
                    Listed by{" "}
                    {item.ownerName ||
                      "Community member"}
                  </div>

                  <div className="item-actions">
                    {item.exchangeType ===
                      "Swap" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSwap(item)
                        }
                      >
                        Swap
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleEditItem(item)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteItem(item)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="footer">
        <h3>ReWear</h3>
        <p>
          Wear again. Share more. Make fashion
          sustainable.
        </p>
      </footer>
    </div>
  );
}

export default App;