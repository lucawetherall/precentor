import { useRef, useState, useCallback } from "react";

interface UseSortableListOptions {
  items: { id: string }[];
  onReorder: (orderedIds: string[]) => void;
}

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  style: React.CSSProperties;
  "aria-label": string;
  tabIndex: number;
  role: string;
}

interface ItemProps {
  "data-sortable-id": string;
  style: React.CSSProperties;
  "aria-grabbed": boolean;
}

interface UseSortableListReturn {
  dragHandleProps: (id: string) => DragHandleProps;
  draggingId: string | null;
  overId: string | null;
  itemProps: (id: string) => ItemProps;
}

export function useSortableList({
  items,
  onReorder,
}: UseSortableListOptions): UseSortableListReturn {
  // Visual state (causes re-render for drag feedback)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Drag tracking refs (no re-renders on change)
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const draggingIndexRef = useRef<number>(-1);
  const overIndexRef = useRef<number>(-1);

  // Keep items in a ref so callbacks always see the latest list
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const getItemIdFromElement = useCallback((el: Element | null): string | null => {
    if (!el) return null;

    // Walk up the DOM to find an element with data-sortable-id
    let node: Element | null = el;
    while (node) {
      const id = node.getAttribute("data-sortable-id");
      if (id) return id;
      node = node.parentElement;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      const index = itemsRef.current.findIndex((item) => item.id === id);
      if (index === -1) return;

      e.preventDefault();
      // Capture pointer so move/up events continue to fire on this element
      e.currentTarget.setPointerCapture(e.pointerId);

      startYRef.current = e.clientY;
      currentYRef.current = e.clientY;
      draggingIndexRef.current = index;
      overIndexRef.current = index;

      setDraggingId(id);
      setOverId(id);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (draggingIndexRef.current === -1) return;

      currentYRef.current = e.clientY;

      // Temporarily release pointer capture so elementFromPoint returns the element
      // actually under the cursor (pointer capture would otherwise always return the handle).
      const handle = e.currentTarget as Element;
      handle.releasePointerCapture(e.pointerId);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      handle.setPointerCapture(e.pointerId);

      // Determine which item the pointer is currently over
      const hoveredId = getItemIdFromElement(el);
      if (hoveredId && hoveredId !== id) {
        const hoveredIndex = itemsRef.current.findIndex(
          (item) => item.id === hoveredId
        );
        if (hoveredIndex !== -1) {
          overIndexRef.current = hoveredIndex;
          setOverId(hoveredId);
        }
      }
    },
    [getItemIdFromElement]
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent, id: string) => {
      if (draggingIndexRef.current === -1) return;

      const dragIdx = draggingIndexRef.current;
      const overIdx = overIndexRef.current;

      // Reset tracking refs
      draggingIndexRef.current = -1;
      overIndexRef.current = -1;
      startYRef.current = 0;
      currentYRef.current = 0;

      // Clear visual state
      setDraggingId(null);
      setOverId(null);

      // Only call onReorder if the position actually changed
      if (dragIdx === overIdx) return;

      const current = itemsRef.current;
      const reordered = [...current];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);

      // Sanity check: ensure the dragged item is still the one we started with
      if (!moved || moved.id !== id) return;

      onReorder(reordered.map((item) => item.id));
    },
    [onReorder]
  );

  const handlePointerCancel = useCallback(() => {
    draggingIndexRef.current = -1;
    overIndexRef.current = -1;
    startYRef.current = 0;
    currentYRef.current = 0;
    setDraggingId(null);
    setOverId(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      const current = itemsRef.current;
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index === 0) return;
        const reordered = [...current];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(index - 1, 0, moved);
        onReorder(reordered.map((item) => item.id));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (index === current.length - 1) return;
        const reordered = [...current];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(index + 1, 0, moved);
        onReorder(reordered.map((item) => item.id));
      }
      // Enter/Space: no-op (keyboard focus is already on the handle; no pending commit needed)
    },
    [onReorder]
  );

  const dragHandleProps = useCallback(
    (id: string): DragHandleProps => ({
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, id),
      onPointerMove: (e: React.PointerEvent) => handlePointerMove(e, id),
      onPointerUp: (e: React.PointerEvent) => handlePointerUp(e, id),
      onPointerCancel: (_e: React.PointerEvent) => handlePointerCancel(),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, id),
      style: { touchAction: "none" } as React.CSSProperties,
      "aria-label": "Drag to reorder",
      tabIndex: 0,
      role: "button",
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleKeyDown]
  );

  const itemProps = useCallback(
    (id: string): ItemProps => {
      const isDragging = draggingId === id;
      const translateY = isDragging
        ? currentYRef.current - startYRef.current
        : 0;

      return {
        "data-sortable-id": id,
        style: isDragging
          ? {
              transform: `translate(0, ${translateY}px)`,
              zIndex: 50,
              position: "relative",
              opacity: 0.85,
            }
          : {},
        "aria-grabbed": isDragging,
      };
    },
    [draggingId]
  );

  return {
    dragHandleProps,
    draggingId,
    overId,
    itemProps,
  };
}
