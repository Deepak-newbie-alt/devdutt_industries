import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError } from "../../api/client";
import {
  addProductBrochure,
  addProductImage,
  addProductVideo,
  deleteProductBrochure,
  deleteProductImage,
  deleteProductVideo,
} from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { StatusMessage } from "../../components/ui/StatusMessage";
import type { AdminProduct } from "../../types/api";
import { ConfirmBar } from "./ConfirmBar";
import { isWebUrl } from "./productFormState";

const LIMITS = { videoTitle: 200, fileName: 255 } as const;
const URL_MESSAGE = "Enter a full web address starting with http:// or https://";

type Removal = { kind: "image" | "video" | "brochure"; id: number; label: string };

// Images, videos and the brochure are stored as links; the backend doesn't take uploads.
export function ProductMedia({ product, onChanged }: { product: AdminProduct; onChanged: () => void }) {
  const { request } = useEmployee();
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Runs one media change; returns whether it worked so forms can reset.
  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError(null);
    setNotice(null);

    try {
      await action();
      setRemoval(null);
      setNotice(success);
      onChanged();
      return true;
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setError(failure.message);
      // Already removed elsewhere: show the current list.
      if (failure.status === 404) onChanged();
      return false;
    } finally {
      setBusy(null);
    }
  }

  const remove = (target: Removal) => {
    const action =
      target.kind === "image"
        ? () => deleteProductImage(request, target.id)
        : target.kind === "video"
          ? () => deleteProductVideo(request, target.id)
          : () => deleteProductBrochure(request, target.id);
    void run(`remove-${target.kind}-${target.id}`, action, `${target.label} removed.`);
  };

  const removeControl = (target: Removal, label: string) =>
    removal?.kind === target.kind && removal.id === target.id ? (
      <ConfirmBar
        confirmLabel="Yes, remove"
        busyLabel="Removing…"
        busy={busy === `remove-${target.kind}-${target.id}`}
        onConfirm={() => remove(target)}
        onCancel={() => setRemoval(null)}
      >
        Remove this {target.kind} from the product? This can't be undone.
      </ConfirmBar>
    ) : (
      <button type="button" className="link-button" disabled={busy !== null} aria-label={label} onClick={() => setRemoval(target)}>
        Remove
      </button>
    );

  return (
    <section className="media" aria-labelledby="media-heading">
      <h2 id="media-heading">Images, videos and brochure</h2>
      <p className="muted">Add links to files that are already online. The first image (lowest order) is the main photo on the website.</p>

      {notice && (
        <StatusMessage tone="success">
          <p>{notice}</p>
        </StatusMessage>
      )}
      {error && (
        <StatusMessage tone="error" title="That didn't work">
          <p>{error}</p>
        </StatusMessage>
      )}

      <div className="panel">
        <h3 className="panel__title">Images</h3>
        {product.images.length === 0 ? (
          <p className="muted">No images yet.</p>
        ) : (
          <ul className="media-list">
            {product.images.map((image, index) => (
              <li key={image.id} className="media-list__item">
                <img className="media-list__thumb" src={image.imageUrl} alt="" loading="lazy" />
                <div className="media-list__body">
                  <a href={image.imageUrl} target="_blank" rel="noopener noreferrer" className="media-list__link">
                    {image.imageUrl}
                  </a>
                  <span className="muted">Order {image.displayOrder}</span>
                </div>
                {removeControl({ kind: "image", id: image.id, label: "Image" }, `Remove image ${index + 1}`)}
              </li>
            ))}
          </ul>
        )}
        <AddImageForm
          busy={busy}
          nextOrder={product.images.reduce((max, image) => Math.max(max, image.displayOrder + 1), 0)}
          onAdd={(imageUrl, displayOrder) =>
            run("add-image", () => addProductImage(request, { productId: product.id, imageUrl, displayOrder }), "Image added.")
          }
        />
      </div>

      <div className="panel">
        <h3 className="panel__title">Videos</h3>
        {product.videos.length === 0 ? (
          <p className="muted">No videos yet.</p>
        ) : (
          <ul className="media-list">
            {product.videos.map((video) => (
              <li key={video.id} className="media-list__item">
                <div className="media-list__body">
                  <span>{video.title}</span>
                  <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="media-list__link">
                    {video.youtubeUrl}
                  </a>
                  <span className="muted">Order {video.displayOrder}</span>
                </div>
                {removeControl({ kind: "video", id: video.id, label: "Video" }, `Remove video ${video.title}`)}
              </li>
            ))}
          </ul>
        )}
        <AddVideoForm
          busy={busy}
          nextOrder={product.videos.reduce((max, video) => Math.max(max, video.displayOrder + 1), 0)}
          onAdd={(youtubeUrl, title, displayOrder) =>
            run("add-video", () => addProductVideo(request, { productId: product.id, youtubeUrl, title, displayOrder }), "Video added.")
          }
        />
      </div>

      <div className="panel">
        <h3 className="panel__title">Brochure</h3>
        {product.brochure ? (
          <ul className="media-list">
            <li className="media-list__item">
              <div className="media-list__body">
                <span>{product.brochure.fileName}</span>
                <a href={product.brochure.fileUrl} target="_blank" rel="noopener noreferrer" className="media-list__link">
                  {product.brochure.fileUrl}
                </a>
              </div>
              {removeControl({ kind: "brochure", id: product.brochure.id, label: "Brochure" }, "Remove brochure")}
            </li>
          </ul>
        ) : (
          <>
            <p className="muted">No brochure yet. A product can have one.</p>
            <AddBrochureForm
              busy={busy}
              onAdd={(fileUrl, fileName) =>
                run("add-brochure", () => addProductBrochure(request, { productId: product.id, fileUrl, fileName }), "Brochure added.")
              }
            />
          </>
        )}
        {product.brochure && <p className="muted">To replace the brochure, remove it first.</p>}
      </div>
    </section>
  );
}

function AddForm({ title, busy, submitLabel, onSubmit, children }: { title: string; busy: boolean; submitLabel: string; onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  return (
    <form className="media-form" onSubmit={onSubmit} noValidate aria-label={title}>
      <fieldset className="plain-fieldset" disabled={busy}>
        {children}
        <button type="submit" className="button button--secondary">
          {submitLabel}
        </button>
      </fieldset>
    </form>
  );
}

function orderError(value: string) {
  return /^\d+$/.test(value.trim()) && Number(value) <= 2_147_483_647 ? undefined : "Enter a whole number, 0 or more.";
}

function AddImageForm({ busy, nextOrder, onAdd }: { busy: string | null; nextOrder: number; onAdd: (url: string, order: number) => Promise<boolean> }) {
  const [url, setUrl] = useState("");
  const [order, setOrder] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ url?: string; order?: string }>({});
  const orderValue = order ?? String(nextOrder);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = { url: isWebUrl(url) ? undefined : URL_MESSAGE, order: orderError(orderValue) };
    setErrors(found);
    if (found.url || found.order) return;

    if (await onAdd(url.trim(), Number(orderValue))) {
      setUrl("");
      setOrder(null);
    }
  }

  return (
    <AddForm title="Add an image" busy={busy !== null} submitLabel={busy === "add-image" ? "Adding…" : "Add image"} onSubmit={submit}>
      <div className="media-form__grid">
        <FormField id="image-url" label="Image link" error={errors.url}>
          {(a11y) => <input id="image-url" className="input" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} {...a11y} />}
        </FormField>
        <FormField id="image-order" label="Order" error={errors.order}>
          {(a11y) => <input id="image-order" className="input" inputMode="numeric" value={orderValue} onChange={(e) => setOrder(e.target.value)} {...a11y} />}
        </FormField>
      </div>
    </AddForm>
  );
}

function AddVideoForm({
  busy,
  nextOrder,
  onAdd,
}: {
  busy: string | null;
  nextOrder: number;
  onAdd: (url: string, title: string, order: number) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ url?: string; title?: string; order?: string }>({});
  const orderValue = order ?? String(nextOrder);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = {
      url: isWebUrl(url) ? undefined : URL_MESSAGE,
      title: title.trim() ? undefined : "Enter a title.",
      order: orderError(orderValue),
    };
    setErrors(found);
    if (found.url || found.title || found.order) return;

    if (await onAdd(url.trim(), title.trim(), Number(orderValue))) {
      setUrl("");
      setTitle("");
      setOrder(null);
    }
  }

  return (
    <AddForm title="Add a video" busy={busy !== null} submitLabel={busy === "add-video" ? "Adding…" : "Add video"} onSubmit={submit}>
      <FormField id="video-title" label="Video title" error={errors.title}>
        {(a11y) => <input id="video-title" className="input" maxLength={LIMITS.videoTitle} value={title} onChange={(e) => setTitle(e.target.value)} {...a11y} />}
      </FormField>
      <div className="media-form__grid">
        <FormField id="video-url" label="YouTube link" error={errors.url}>
          {(a11y) => (
            <input id="video-url" className="input" type="url" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} {...a11y} />
          )}
        </FormField>
        <FormField id="video-order" label="Order" error={errors.order}>
          {(a11y) => <input id="video-order" className="input" inputMode="numeric" value={orderValue} onChange={(e) => setOrder(e.target.value)} {...a11y} />}
        </FormField>
      </div>
    </AddForm>
  );
}

function AddBrochureForm({ busy, onAdd }: { busy: string | null; onAdd: (url: string, fileName: string) => Promise<boolean> }) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<{ url?: string; fileName?: string }>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = { url: isWebUrl(url) ? undefined : URL_MESSAGE, fileName: fileName.trim() ? undefined : "Enter the name shown to visitors." };
    setErrors(found);
    if (found.url || found.fileName) return;

    if (await onAdd(url.trim(), fileName.trim())) {
      setUrl("");
      setFileName("");
    }
  }

  return (
    <AddForm title="Add a brochure" busy={busy !== null} submitLabel={busy === "add-brochure" ? "Adding…" : "Add brochure"} onSubmit={submit}>
      <FormField id="brochure-name" label="Name shown to visitors" hint="e.g. Product brochure (PDF)" error={errors.fileName}>
        {(a11y) => <input id="brochure-name" className="input" maxLength={LIMITS.fileName} value={fileName} onChange={(e) => setFileName(e.target.value)} {...a11y} />}
      </FormField>
      <FormField id="brochure-url" label="Brochure link" error={errors.url}>
        {(a11y) => <input id="brochure-url" className="input" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} {...a11y} />}
      </FormField>
    </AddForm>
  );
}
