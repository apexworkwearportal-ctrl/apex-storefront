"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Phone, Mail, Clock, MapPin, Send, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry.");
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      {/* Hero Header */}
      <section className="gradient-bg" style={{ padding: "4rem 2rem", color: "white", textAlign: "center" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", marginBottom: "1rem" }}>
            Get In Touch
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.6" }}>
            Have questions about custom substrates, turnaround times, or file templates? Ask us anything.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section style={{
        padding: "5rem 2rem",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1.25fr",
        gap: "4rem",
        flexWrap: "wrap"
      }} className="contact-grid">
        {/* Left Side: Contact Information */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
        >
          <div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>Apex Support</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Call our support desk directly, email our print experts, or visit our operations.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Phone */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                shrink: 0
              }}>
                <Phone size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Phone Number</h4>
                <a href="tel:6475701249" style={{ color: "hsl(var(--foreground-hsl))", fontSize: "0.9rem", display: "inline-block", marginTop: "0.25rem" }}>
                  (647) 570-1249
                </a>
              </div>
            </div>

            {/* Email */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                shrink: 0
              }}>
                <Mail size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Email Address</h4>
                <a href="mailto:info@apexworkwear.ca" style={{ color: "hsl(var(--foreground-hsl))", fontSize: "0.9rem", display: "inline-block", marginTop: "0.25rem" }}>
                  info@apexworkwear.ca
                </a>
              </div>
            </div>

            {/* Address */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                shrink: 0
              }}>
                <MapPin size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Location</h4>
                <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginTop: "0.25rem", lineHeight: "1.4" }}>
                  Greater Toronto Area<br />
                  Ontario, Canada
                </p>
              </div>
            </div>

            {/* Hours */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                shrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Business Hours</h4>
                <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  Monday – Friday: 9:00 AM – 6:00 PM EST
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="card" 
          style={{ padding: "2.5rem 2rem", boxShadow: "var(--shadow-md)", border: "1px solid hsl(var(--border-hsl))" }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Send a Message</h2>
          
          {success && (
            <div className="card" style={{
              borderColor: "hsl(var(--success-hsl))",
              backgroundColor: "hsl(var(--success-hsl) / 0.05)",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              color: "hsl(var(--success-hsl))",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 600
            }}>
              <CheckCircle size={18} /> Message submitted successfully! We will reply within 1 business day.
            </div>
          )}

          {error && (
            <div className="card" style={{
              borderColor: "hsl(var(--destructive-hsl))",
              backgroundColor: "hsl(var(--destructive-hsl) / 0.05)",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              color: "hsl(var(--destructive-hsl))",
              fontWeight: 600
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label className="label" htmlFor="name">Your Name</label>
              <input
                id="name"
                className="input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="subject">Subject</label>
              <input
                id="subject"
                className="input"
                placeholder="Inquiry about business cards..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="message">Message</label>
              <textarea
                id="message"
                className="input"
                placeholder="Enter details about your print requirements..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Sending Message...
                </>
              ) : (
                <>
                  <Send size={16} /> Send Message
                </>
              )}
            </button>
          </form>
        </motion.div>
      </section>

      <Footer />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
        }
      `}</style>
    </div>
  );
}
