"use client";

import { useState, useEffect } from "react";

export function TodayDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);
  return <>{date || "Today"}</>;
}
