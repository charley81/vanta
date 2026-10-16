"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { DEFAULT_MORPH_SESSION } from "@/src/continuity";
import {
  type MorphControl,
  type SynthControlDefinition,
} from "@/src/synth/controls";
import {
  morphControlSurface,
  morphSessionStore,
} from "@/src/synth/session.client";

import styles from "./synth.module.css";

type SynthControlDeckProps = {
  controls: readonly SynthControlDefinition[];
};

const ANNOUNCEMENT_DELAY_MS = 450;

export function SynthControlDeck({ controls }: SynthControlDeckProps) {
  const session = useSyncExternalStore(
    morphSessionStore.subscribe,
    morphSessionStore.getSnapshot,
    () => DEFAULT_MORPH_SESSION,
  );
  const [openControl, setOpenControl] = useState<MorphControl | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const selectorRefs = useRef(new Map<MorphControl, HTMLButtonElement>());
  const rangeRefs = useRef(new Map<MorphControl, HTMLInputElement>());
  const pendingRangeFocus = useRef<MorphControl | null>(null);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!openControl || pendingRangeFocus.current !== openControl) return;
    pendingRangeFocus.current = null;
    rangeRefs.current.get(openControl)?.focus();
  }, [openControl]);

  useEffect(
    () => () => {
      if (announcementTimer.current) clearTimeout(announcementTimer.current);
    },
    [],
  );

  function selectControl(
    control: MorphControl,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    morphControlSurface.select(control, "semantic");
    pendingRangeFocus.current = event.detail === 0 ? control : null;
    setOpenControl(control);
  }

  function closeControl(control: MorphControl) {
    pendingRangeFocus.current = null;
    setOpenControl(null);
    selectorRefs.current.get(control)?.focus();
  }

  function handlePanelKeyDown(
    control: MorphControl,
    event: KeyboardEvent<HTMLElement>,
  ) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeControl(control);
  }

  function updateValue(
    control: MorphControl,
    name: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value = Number(event.currentTarget.value);
    if (!morphControlSurface.setNormalizedValue(control, value, "semantic")) {
      return;
    }
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(`${name} ${value} percent.`);
      announcementTimer.current = null;
    }, ANNOUNCEMENT_DELAY_MS);
  }

  return (
    <div className={styles.controlDeck}>
      <div aria-labelledby="control-selector-heading" className={styles.controlSelector}>
        <div className={styles.deckHeadingRow}>
          <div>
            <p className={styles.deckKicker}>Normalized session</p>
            <h3 id="control-selector-heading">Choose a control</h3>
          </div>
          <p>Values remain in this tab during VANTA navigation.</p>
        </div>
        <ul className={styles.controlList}>
          {controls.map((control, index) => {
            const value = session.values[control.id];
            const selected = session.selectedControl === control.id;
            const expanded = openControl === control.id;
            return (
              <li className={styles.controlItem} key={control.id}>
                <button
                  aria-controls={`control-panel-${control.id}`}
                  aria-expanded={expanded}
                  aria-label={`Open ${control.name} control, current value ${value} percent`}
                  aria-pressed={selected}
                  className={styles.controlSelectorButton}
                  data-control-selector={control.id}
                  onClick={(event) => selectControl(control.id, event)}
                  ref={(node) => {
                    if (node) selectorRefs.current.set(control.id, node);
                    else selectorRefs.current.delete(control.id);
                  }}
                  type="button"
                >
                  <span className={styles.controlIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{control.name}</span>
                  <span className={styles.selectorValue}>{value}%</span>
                </button>
                <p>{control.purpose}</p>
                <p className={styles.selectorEndpoints}>
                  <span>0 / {control.endpoints[0]}</span>
                  <span>100 / {control.endpoints[1]}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <aside
        aria-label="Focused control"
        className={styles.focusPanel}
        data-panel-open={openControl === null ? "false" : "true"}
      >
        {openControl === null ? (
          <div className={styles.panelEmpty}>
            <p className={styles.deckKicker}>Control detail</p>
            <h3>Select one of the six controls.</h3>
            <p>
              Its native range opens here. Values can be inspected and adjusted
              whether sound is off or playing.
            </p>
          </div>
        ) : null}
        {controls.map((control) => {
          const inputId = `control-range-${control.id}`;
          const purposeId = `control-purpose-${control.id}`;
          const endpointsId = `control-endpoints-${control.id}`;
          const guidanceId = `control-guidance-${control.id}`;
          const value = session.values[control.id];
          return (
            <section
              aria-labelledby={`control-title-${control.id}`}
              hidden={openControl !== control.id}
              id={`control-panel-${control.id}`}
              key={control.id}
              onKeyDown={(event) => handlePanelKeyDown(control.id, event)}
            >
              <div className={styles.panelHeadingRow}>
                <div>
                  <p className={styles.deckKicker}>{control.valueLabel}</p>
                  <h3 id={`control-title-${control.id}`}>{control.name}</h3>
                </div>
                <button
                  className={styles.closeButton}
                  onClick={() => closeControl(control.id)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <p className={styles.panelPurpose} id={purposeId}>
                {control.purpose}
              </p>
              <div className={styles.valueRow}>
                <label htmlFor={inputId}>{control.name} value</label>
                <output htmlFor={inputId}>{value}%</output>
              </div>
              <input
                aria-describedby={`${purposeId} ${endpointsId} ${guidanceId}`}
                aria-valuetext={`${value} percent`}
                className={styles.range}
                id={inputId}
                max={100}
                min={0}
                onChange={(event) => updateValue(control.id, control.name, event)}
                ref={(node) => {
                  if (node) rangeRefs.current.set(control.id, node);
                  else rangeRefs.current.delete(control.id);
                }}
                step={1}
                type="range"
                value={value}
              />
              <div className={styles.rangeEndpoints} id={endpointsId}>
                <span>0 / {control.endpoints[0]}</span>
                <span>100 / {control.endpoints[1]}</span>
              </div>
              <p className={styles.rangeGuidance} id={guidanceId}>
                Use Arrow keys for single steps. Press Escape or Close to return
                to the {control.name} selector.
              </p>
            </section>
          );
        })}
      </aside>

      <p
        aria-atomic="true"
        aria-live="polite"
        className={styles.visuallyHidden}
        data-control-announcement
        role="status"
      >
        {announcement}
      </p>
    </div>
  );
}
