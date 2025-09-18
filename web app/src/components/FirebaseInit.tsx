"use client";

import { useEffect } from "react";
import { getFirebaseApp } from "@/lib/firebase";

export function FirebaseInit() {
  useEffect(() => {
    getFirebaseApp();
  }, []);

  return null;
}
