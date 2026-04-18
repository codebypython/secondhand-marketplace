"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length >= 2) {
        try {
          // Fallback to fetch if api doesn't expose it directly yet
          const res = await fetch(`http://localhost:8000/api/v1/listings/search/suggestions?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
          }
        } catch (e) {
          console.error("Error fetching suggestions", e);
        }
      } else {
        setSuggestions([]);
      }
    };
    
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/?search=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, maxWidth: 400, marginLeft: 20 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%" }}>
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          style={{ 
            width: "100%", 
            padding: "8px 16px", 
            borderRadius: "var(--radius-full)", 
            border: "1px solid var(--border)",
            background: "var(--bg-inset)"
          }}
        />
        <button 
          type="submit" 
          style={{ 
            position: "absolute", 
            right: 12, 
            top: "50%", 
            transform: "translateY(-50%)", 
            background: "none", 
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)"
          }}
        >
          🔍
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 4,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 50,
          maxHeight: 300,
          overflowY: "auto"
        }}>
          {suggestions.map((suggestion, i) => (
            <div 
              key={i} 
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-inset)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>🔍</span>
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
