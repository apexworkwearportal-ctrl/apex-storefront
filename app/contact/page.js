"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Phone, Mail, Clock, MapPin, Send, Loader2, CheckCircle, Globe } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "hsl(var(--background-hsl))" }}>
      <Header />

      {/* Hero Header */}
      <section className="gradient-bg" style={{ padding: "5rem 2rem", color: "white", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none"
        }} />
        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Get In Touch
          </h1>
          <p style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.85)", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto" }}>
            Have questions about custom substrates, turnaround times, or file templates? Ask us anything.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section style={{
        padding: "5rem 2rem 2rem 2rem",
        maxWidth: "1140px",
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap: "4rem",
      }} className="contact-grid">
        
        {/* Left Side: Contact Information */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
        >
          <div>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "0.75rem", fontWeight: 800 }}>Apex Support</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", lineHeight: "1.6" }}>
              Call our support desk directly, email our print experts, or visit our operations.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Phone */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Phone size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground-hsl))" }}>Phone Number</h4>
                <a href="tel:6475701249" style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", display: "inline-block", marginTop: "0.25rem", textDecoration: "none", fontWeight: 500 }}>
                  (647) 570-1249
                </a>
              </div>
            </div>

            {/* Email */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Mail size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground-hsl))" }}>Email Address</h4>
                <a href="mailto:info@apexworkwear.ca" style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", display: "inline-block", marginTop: "0.25rem", textDecoration: "none", fontWeight: 500 }}>
                  info@apexworkwear.ca
                </a>
              </div>
            </div>

            {/* Address */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <MapPin size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground-hsl))" }}>Location</h4>
                <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginTop: "0.25rem", lineHeight: "1.5" }}>
                  1515 Britannia Rd E, Unit 14-15<br />
                  Mississauga, ON L4W 4K1
                </p>
              </div>
            </div>

            {/* Hours */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground-hsl))" }}>Business Hours</h4>
                <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginTop: "0.25rem", lineHeight: "1.4" }}>
                  Monday – Friday: 9:00 AM – 8:30 PM EST<br />
                  <span style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem" }}>Saturday & Sunday: Closed</span>
                </p>
              </div>
            </div>

            {/* Areas We Serve (New highlight block matching wireframe legend) */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--primary-hsl) / 0.15)",
                color: "hsl(var(--primary-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid hsl(var(--primary-hsl) / 0.3)",
                flexShrink: 0
              }}>
                <Globe size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--primary-hsl))" }}>Areas We Serve</h4>
                <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginTop: "0.25rem", lineHeight: "1.5" }}>
                  Proudly serving the Greater Toronto and Hamilton Area. We ship across Ontario.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="card" 
          style={{ padding: "3rem 2.5rem", boxShadow: "var(--shadow-lg)", border: "1px solid hsl(var(--border-hsl))" }}
        >
          <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem", fontWeight: 800 }}>Send a Message</h2>
          
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
                required
                rows={5}
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.85rem" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} /> Sending Message...
                </>
              ) : (
                <>
                  <Send size={16} style={{ marginRight: "0.5rem" }} /> Send Message
                </>
              )}
            </button>
          </form>
        </motion.div>
      </section>

      {/* Map Embed Section */}
      <section style={{
        maxWidth: "1140px",
        margin: "0 auto 5rem auto",
        padding: "0 2rem",
        width: "100%"
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="card"
          style={{ padding: "0.5rem", overflow: "hidden", border: "1px solid hsl(var(--border-hsl))" }}
        >
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2888.665725656107!2d-79.64506248450352!3d43.655075679121285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b3fa30a03c37d%3A0xe54efef2d3b248a3!2s1515%20Britannia%20Rd%20E%20Unit%2014%2C%20Mississauga%2C%20ON%20L4W%204K1!5e0!3m2!1sen!2sca!4v1680000000000!5m2!1sen!2sca" 
            width="100%" 
            height="380" 
            style={{ border: 0, borderRadius: "var(--radius-md)", display: "block" }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
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
