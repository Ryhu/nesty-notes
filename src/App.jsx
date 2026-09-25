import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

const newId = () => crypto.randomUUID();

function updateAccordion(items, targetId, updater) {
  return items.map((item) => {
    if (item.id === targetId) return updater(item);

    return {
      ...item,
      children: item.children.map((child) =>
        child.type === "accordion"
          ? {
              ...child,
              accordion: updateAccordion(
                [child.accordion],
                targetId,
                updater,
              )[0],
            }
          : child,
      ),
    };
  });
}

function removeAccordion(items, targetId) {
  return items
    .filter((item) => item.id !== targetId)
    .map((item) => ({
      ...item,
      children: item.children
        .filter(
          (child) =>
            child.type !== "accordion" || child.accordion.id !== targetId,
        )
        .map((child) =>
          child.type === "accordion"
            ? {
                ...child,
                accordion: removeAccordion([child.accordion], targetId)[0],
              }
            : child,
        )
        .filter((child) => child.type !== "accordion" || child.accordion),
    }));
}

function collectAccordionIds(items, ids = new Set()) {
  items.forEach((item) => {
    ids.add(item.id);
    item.children.forEach((child) => {
      if (child.type === "accordion") {
        collectAccordionIds([child.accordion], ids);
      }
    });
  });
  return ids;
}

function findAccordion(items, targetId) {
  for (const item of items) {
    if (item.id === targetId) return item;

    for (const child of item.children) {
      if (child.type === "accordion") {
        const match = findAccordion([child.accordion], targetId);
        if (match) return match;
      }
    }
  }

  return null;
}

function findAccordionPath(items, targetId, path = []) {
  for (const item of items) {
    const nextPath = [...path, item.id];
    if (item.id === targetId) return nextPath;

    for (const child of item.children) {
      if (child.type === "accordion") {
        const match = findAccordionPath([child.accordion], targetId, nextPath);
        if (match) return match;
      }
    }
  }

  return null;
}

function Markdown({ content }) {
  const html = DOMPurify.sanitize(marked.parse(content));
  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function AccordionItem({
  accordion,
  depth,
  isOpen,
  onToggle,
  onChange,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const itemRef = useRef(null);
  const open = isOpen(accordion.id);

  useEffect(() => {
    if (!isEditing) return;

    const finishEditingOutside = (event) => {
      if (itemRef.current && !itemRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };

    const finishEditingWithShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setIsEditing(false);
      }
    };

    document.addEventListener("pointerdown", finishEditingOutside, true);
    document.addEventListener("keydown", finishEditingWithShortcut);
    return () => {
      document.removeEventListener("pointerdown", finishEditingOutside, true);
      document.removeEventListener("keydown", finishEditingWithShortcut);
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setShowAddMenu(false);
  }, [isEditing]);

  const updateTitle = (title) =>
    onChange(accordion.id, (item) => ({ ...item, title }));

  const updateText = (childId, content) => {
    onChange(accordion.id, (item) => ({
      ...item,
      children: item.children.map((child) =>
        child.id === childId ? { ...child, content } : child,
      ),
    }));
  };

  const removeChild = (childId) => {
    onChange(accordion.id, (item) => ({
      ...item,
      children: item.children.filter((child) => child.id !== childId),
    }));
  };

  const addText = () => {
    onChange(accordion.id, (item) => ({
      ...item,
      children: [
        ...item.children,
        { id: newId(), type: "text", content: "Write **Markdown** here." },
      ],
    }));
    setShowAddMenu(false);
  };

  const addAccordion = () => {
    const id = newId();
    onChange(accordion.id, (item) => ({
      ...item,
      children: [
        ...item.children,
        {
          id: newId(),
          type: "accordion",
          accordion: { id, title: "New accordion", children: [] },
        },
      ],
    }));
    onToggle(id, true);
    setShowAddMenu(false);
  };

  return (
    <div
      ref={itemRef}
      id={`accordion-${accordion.id}`}
      className={`accordion-item depth-${depth % 8} ${
        isEditing ? "is-editing" : ""
      }`}>
      <h2 className="accordion-header">
        <div className={`accordion-button ${open ? "" : "collapsed"}`}>
          <button
            type="button"
            className="accordion-title-toggle"
            aria-expanded={open}
            aria-controls={`panel-${accordion.id}`}
            onClick={() => onToggle(accordion.id)}>
            <span className="title-text">
              {accordion.title || "Untitled accordion"}
            </span>
          </button>
          <button
            type="button"
            className={`btn btn-sm header-edit ${
              isEditing ? "btn-secondary" : "btn-outline-secondary"
            }`}
            aria-pressed={isEditing}
            onClick={() => {
              setIsEditing((current) => !current);
              if (!open) onToggle(accordion.id, true);
            }}>
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className="accordion-chevron"
            aria-label={open ? "Collapse accordion" : "Expand accordion"}
            aria-expanded={open}
            aria-controls={`panel-${accordion.id}`}
            onClick={() => onToggle(accordion.id)}
          />
        </div>
      </h2>

      <div
        id={`panel-${accordion.id}`}
        className={`accordion-collapse collapse ${open ? "show" : ""}`}>
        <div className="accordion-body">
          {isEditing && (
            <div className="editor-toolbar">
              <input
                className="form-control"
                aria-label="Accordion title"
                value={accordion.title}
                onChange={(event) => updateTitle(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onDelete(accordion.id)}>
                Delete accordion
              </button>
            </div>
          )}

          <div className="content-list">
            {accordion.children.length === 0 && (
              <p className="empty-message">This accordion is empty.</p>
            )}

            {accordion.children.map((child) => (
              <div className="content-item" key={child.id}>
                {child.type === "text" ? (
                  isEditing ? (
                    <div className="text-editor">
                      <textarea
                        className="form-control"
                        rows="10"
                        aria-label="Markdown text"
                        value={child.content}
                        onChange={(event) =>
                          updateText(child.id, event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeChild(child.id)}>
                        Remove text
                      </button>
                    </div>
                  ) : (
                    <Markdown content={child.content} />
                  )
                ) : (
                  <div className="nested-accordion">
                    {isEditing && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger remove-child"
                        onClick={() => removeChild(child.id)}>
                        Remove nested accordion
                      </button>
                    )}
                    <div className="accordion">
                      <AccordionItem
                        accordion={child.accordion}
                        depth={depth + 1}
                        isOpen={isOpen}
                        onToggle={onToggle}
                        onChange={onChange}
                        onDelete={onDelete}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="add-control">
              {showAddMenu ? (
                <div
                  className="btn-group"
                  role="group"
                  aria-label="Add content">
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={addText}>
                    Add Markdown
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={addAccordion}>
                    Add accordion
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowAddMenu(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => setShowAddMenu(true)}>
                  + Add content
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerOutline({ accordions, onSelect }) {
  return (
    <ul className="drawer-outline">
      {accordions.map((accordion) => {
        const nestedAccordions = accordion.children
          .filter((child) => child.type === "accordion")
          .map((child) => child.accordion);

        return (
          <li key={accordion.id}>
            <button type="button" onClick={() => onSelect(accordion.id)}>
              {accordion.title || "Untitled accordion"}
            </button>
            {nestedAccordions.length > 0 && (
              <DrawerOutline
                accordions={nestedAccordions}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function App() {
  const [accordions, setAccordions] = useState([]);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [status, setStatus] = useState("Loading…");
  const loaded = useRef(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    fetch("/api/accordions")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load accordion data.");
        return response.json();
      })
      .then((data) => {
        setAccordions(data);
        setOpenIds(new Set());
        loaded.current = true;
        setStatus("Saved");
      })
      .catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!loaded.current) return;

    setStatus("Saving…");
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/accordions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accordions),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        setStatus("Saved");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("Save failed");
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [accordions]);

  useEffect(() => {
    const validIds = collectAccordionIds(accordions);
    setOpenIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [accordions]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const closeWithEscape = (event) => {
      if (event.key === "Escape") setIsDrawerOpen(false);
    };

    const closeWhenClickingAway = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsDrawerOpen(false);
        if (drawerRef.current.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener("keydown", closeWithEscape);
    document.addEventListener("pointerdown", closeWhenClickingAway);
    return () => {
      document.removeEventListener("keydown", closeWithEscape);
      document.removeEventListener("pointerdown", closeWhenClickingAway);
    };
  }, [isDrawerOpen]);

  const toggleAccordion = (id, forceOpen = false) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (forceOpen) next.add(id);
      else if (next.has(id)) {
        const accordion = findAccordion(accordions, id);
        if (accordion) {
          collectAccordionIds([accordion]).forEach((childId) =>
            next.delete(childId),
          );
        } else {
          next.delete(id);
        }
      } else next.add(id);
      return next;
    });
  };

  const deleteAccordion = (id) => {
    if (!window.confirm("Delete this accordion and all of its contents?"))
      return;
    setAccordions((current) => removeAccordion(current, id));
  };

  const goToAccordion = (id) => {
    const path = findAccordionPath(accordions, id);
    if (!path) return;

    setOpenIds((current) => new Set([...current, ...path]));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(`accordion-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <>
      <div
        ref={drawerRef}
        className={`side-drawer ${isDrawerOpen ? "is-open" : ""}`}>
        <aside
          id="notes-drawer"
          className="side-drawer-panel"
          aria-label="Accordion outline">
          <div className="side-drawer-header">
            <p className="eyebrow">Navigation</p>
            <h2>Outline</h2>
          </div>
          <nav aria-label="Notes outline">
            {accordions.length > 0 ? (
              <DrawerOutline accordions={accordions} onSelect={goToAccordion} />
            ) : (
              <p className="drawer-empty">No accordions yet.</p>
            )}
          </nav>
        </aside>
        <button
          type="button"
          className="side-drawer-tab"
          aria-controls="notes-drawer"
          aria-expanded={isDrawerOpen}
          aria-label={isDrawerOpen ? "Close outline" : "Open outline"}
          onClick={(event) => {
            setIsDrawerOpen((current) => !current);
            if (isDrawerOpen) event.currentTarget.blur();
          }}>
          <span aria-hidden="true">{isDrawerOpen ? "‹" : "›"}</span>
          <span className="side-drawer-tab-label">Outline</span>
        </button>
      </div>

      <main className="container page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Nesty Notes</p>
            <h1>System Design</h1>
            <p className="lead">
              Helpful tools are available from the left side pull tab
            </p>
          </div>
          <div className="header-actions">
            <span
              className={`save-status ${status === "Save failed" ? "text-danger" : ""}`}
              aria-live="polite">
              {status}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={openIds.size === 0}
              onClick={() => setOpenIds(new Set())}>
              Collapse all
            </button>
          </div>
        </header>

        <div className="accordion root-accordion">
          {accordions.map((accordion) => (
            <AccordionItem
              key={accordion.id}
              accordion={accordion}
              depth={0}
              isOpen={(id) => openIds.has(id)}
              onToggle={toggleAccordion}
              onChange={(id, updater) =>
                setAccordions((current) =>
                  updateAccordion(current, id, updater),
                )
              }
              onDelete={deleteAccordion}
            />
          ))}
        </div>

        {accordions.length === 0 && status !== "Loading…" && (
          <div className="empty-page">
            <h2>No accordions left</h2>
            <p>Reload the starter JSON or add a new top-level accordion.</p>
          </div>
        )}

        <button
          type="button"
          className="btn btn-dark add-root"
          onClick={() => {
            const id = newId();
            setAccordions((current) => [
              ...current,
              { id, title: "New top-level accordion", children: [] },
            ]);
            toggleAccordion(id, true);
          }}>
          + Add top-level accordion
        </button>
      </main>
    </>
  );
}
