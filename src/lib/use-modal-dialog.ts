"use client";

import { RefObject, useLayoutEffect } from "react";

// Login and loading dialogs may overlap and unmount in either order. Only the
// last owner can restore scrolling; restoring each dialog's snapshot can leave
// overflow:hidden behind after a successful login.
const owners = new Set<symbol>();
let previous: { element: HTMLElement; value: string; priority: string }[] = [];

function lockPageScroll() {
  const owner = Symbol("modal");
  if (!owners.size) {
    previous = [document.documentElement, document.body].map(element => ({
      element, value: element.style.getPropertyValue("overflow"), priority: element.style.getPropertyPriority("overflow"),
    }));
    previous.forEach(({ element }) => element.style.setProperty("overflow", "hidden"));
  }
  owners.add(owner);
  return () => {
    if (!owners.delete(owner) || owners.size) return;
    previous.forEach(({ element, value, priority }) => {
      if (value) element.style.setProperty("overflow", value, priority);
      else element.style.removeProperty("overflow");
    });
    previous = [];
  };
}

export function useModalDialog(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const unlock = lockPageScroll();
    return () => {
      // Release the browser's modal interaction lock before another route paints.
      try { dialog.close(); } finally { unlock(); }
    };
  }, [ref]);
}
