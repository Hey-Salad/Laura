"use client";

import { useState, useEffect } from "react";
import { CameraPhoto } from "@/types/camera";
import { Image as ImageIcon, Calendar, MapPin, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface PhotoGalleryProps {
  cameraId: string;
}

export default function PhotoGallery({ cameraId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<CameraPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<CameraPhoto | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  useEffect(() => {
    fetchPhotos();
  }, [cameraId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cameras/${cameraId}/photos?limit=50`);
      if (!response.ok) throw new Error("Failed to fetch photos");

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (photo: CameraPhoto, index: number) => {
    setSelectedPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const goToPrevious = () => {
    const newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const goToNext = () => {
    const newIndex = lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-8 text-center backdrop-blur">
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-peach border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-8 text-center backdrop-blur">
        <ImageIcon className="mx-auto h-12 w-12 text-zinc-600" />
        <p className="mt-4 text-sm text-zinc-400">No photos captured yet.</p>
        <p className="mt-2 text-xs text-zinc-500">
          Use the "Take Photo" command to capture an image.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Photo Gallery</h3>
          <span className="text-sm text-zinc-400">{photos.length} photos</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, index) => (
            <article
              key={photo.id}
              onClick={() => openLightbox(photo, index)}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all hover:border-brand-cherry/50"
            >
              <div className="relative aspect-video w-full">
                {photo.thumbnail_url || photo.photo_url ? (
                  <Image
                    src={photo.thumbnail_url || photo.photo_url}
                    alt={`Photo taken at ${formatDate(photo.taken_at)}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                    <ImageIcon className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(photo.taken_at)}</span>
                </div>
                {photo.metadata?.location && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {photo.metadata.location.lat?.toFixed(2)},{" "}
                      {photo.metadata.location.lon?.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute right-4 top-4 rounded-lg bg-zinc-900/80 p-2 text-white transition-colors hover:bg-zinc-800"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 rounded-lg bg-zinc-900/80 p-2 text-white transition-colors hover:bg-zinc-800"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 rounded-lg bg-zinc-900/80 p-2 text-white transition-colors hover:bg-zinc-800"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full">
              <Image
                src={selectedPhoto.photo_url}
                alt={`Photo taken at ${formatDate(selectedPhoto.taken_at)}`}
                fill
                className="rounded-lg object-contain"
              />
            </div>
            <div className="mt-4 rounded-lg bg-zinc-900/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(selectedPhoto.taken_at)}</span>
              </div>
              {selectedPhoto.metadata?.location && (
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {selectedPhoto.metadata.location.lat},{" "}
                    {selectedPhoto.metadata.location.lon}
                  </span>
                </div>
              )}
              {selectedPhoto.command_id && (
                <div className="mt-2 text-xs font-mono text-zinc-500">
                  Command: {selectedPhoto.command_id}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
