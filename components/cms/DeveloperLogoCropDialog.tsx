"use client";

import { useEffect, useMemo, useState } from "react";

type DeveloperLogoCropDialogProps = {
	file: File;
	companyName: string;
	aspectRatio?: number;
	outputWidth?: number;
	title?: string;
	onCancel: () => void;
	onSave: (cropped: Blob) => void | Promise<void>;
};

export function DeveloperLogoCropDialog({ file, companyName, aspectRatio = 2, outputWidth = 600, title = "Crop developer logo", onCancel, onSave }: DeveloperLogoCropDialogProps) {
	const outputHeight = Math.round(outputWidth / aspectRatio);
	const aspectLabel = aspectRatio === 2 ? "2:1" : aspectRatio === 4 / 3 ? "4:3" : `${aspectRatio.toFixed(2)}:1`;
	const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [zoom, setZoom] = useState(1);
	const [horizontalPosition, setHorizontalPosition] = useState(50);
	const [verticalPosition, setVerticalPosition] = useState(50);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);

	useEffect(() => {
		const nextImage = new window.Image();
		nextImage.onload = () => setImage(nextImage);
		nextImage.onerror = () => setError("This image could not be opened. Try a PNG, JPG, or WebP image.");
		nextImage.src = sourceUrl;
	}, [sourceUrl]);

	const crop = image ? (() => {
		const width = Math.min(image.naturalWidth, image.naturalHeight * aspectRatio) / zoom;
		const height = width / aspectRatio;
		return {
			width,
			height,
			x: (image.naturalWidth - width) * horizontalPosition / 100,
			y: (image.naturalHeight - height) * verticalPosition / 100,
		};
	})() : null;

	async function saveCrop() {
		if (!image || !crop) return;
		setSaving(true);
		setError("");
		try {
			const canvas = document.createElement("canvas");
			canvas.width = outputWidth;
			canvas.height = outputHeight;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Your browser could not prepare the cropped image.");
			context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not export the cropped image.")), "image/png");
			});
			await onSave(blob);
			setSaving(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not crop this image.");
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
			<section role="dialog" aria-modal="true" aria-labelledby="developer-logo-crop-title" className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 id="developer-logo-crop-title" className="text-base font-semibold text-[#111111]">{title}</h2>
						<p className="mt-1 text-xs text-black/55">Adjust the visible area. The saved image will use a consistent {aspectLabel} frame.</p>
					</div>
					<button type="button" onClick={onCancel} disabled={saving} className="text-sm text-black/55 hover:text-black">Cancel</button>
				</div>

				<div style={{ aspectRatio }} className="relative mx-auto mt-5 w-full max-w-[480px] overflow-hidden rounded-lg border border-dashed border-black/25 bg-[linear-gradient(45deg,#f2f2f2_25%,transparent_25%),linear-gradient(-45deg,#f2f2f2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f2f2f2_75%),linear-gradient(-45deg,transparent_75%,#f2f2f2_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]">
					{image && crop ? <img
						src={sourceUrl}
						alt={`${companyName} crop preview`}
						className="max-w-none"
						style={{
							position: "absolute",
							left: `${-crop.x / crop.width * 100}%`,
							top: `${-crop.y / crop.height * 100}%`,
							width: `${image.naturalWidth / crop.width * 100}%`,
							height: `${image.naturalHeight / crop.height * 100}%`,
						}}
					/> : <div className="grid h-full place-items-center text-xs text-black/50">Loading image…</div>}
				</div>

				<div className="mt-5 grid gap-4 sm:grid-cols-3">
					<label className="text-xs font-medium text-black/70">Zoom
						<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 block w-full accent-[#DE141C]" />
					</label>
					<label className="text-xs font-medium text-black/70">Horizontal position
						<input type="range" min="0" max="100" value={horizontalPosition} onChange={(event) => setHorizontalPosition(Number(event.target.value))} className="mt-2 block w-full accent-[#DE141C]" />
					</label>
					<label className="text-xs font-medium text-black/70">Vertical position
						<input type="range" min="0" max="100" value={verticalPosition} onChange={(event) => setVerticalPosition(Number(event.target.value))} className="mt-2 block w-full accent-[#DE141C]" />
					</label>
				</div>

				{error ? <p role="alert" className="mt-3 text-xs text-red-600">{error}</p> : null}
				<div className="mt-5 flex justify-end gap-2 border-t border-black/10 pt-4">
					<button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-black/15 px-4 py-2 text-sm text-black/70 disabled:opacity-50">Cancel</button>
					<button type="button" onClick={saveCrop} disabled={!image || saving} className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Preparing…" : "Crop and upload"}</button>
				</div>
			</section>
		</div>
	);
}
