import { useState, useRef } from 'react';
import { Upload, Video, FileText, X, Image, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { useSubmission } from '../hooks/useFirestore';
import toast from 'react-hot-toast';

export default function SubmissionForm({ moduleId, onSuccess }) {
  const { submitProof } = useSubmission();
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const MIN_WORDS = 100;

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images autorisées');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const isValid = images.length > 0 && wordCount >= MIN_WORDS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error(`Veuillez fournir des images et une description (min ${MIN_WORDS} mots)`);
      return;
    }

    setSubmitting(true);
    try {
      await submitProof(moduleId, { images, videoUrl, description });
      toast.success('Preuve soumise avec succès !');
      onSuccess?.();
    } catch (error) {
      toast.error('Échec de la soumission : ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-heading mb-3">
          <Image className="w-4 h-4 text-primary-400" />
          Captures d'écran / Images <span className="text-red-400">*</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-themed hover:border-primary-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
        >
          <Upload className="w-10 h-10 text-muted group-hover:text-primary-400 mx-auto mb-3 transition-colors" />
          <p className="text-body text-sm">
            Cliquez pour télécharger ou glissez-déposez
          </p>
          <p className="text-muted text-xs mt-1">PNG, JPG jusqu'à 5 Mo chacune (max 5 images)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-themed"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-heading" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video URL */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-heading mb-3">
          <Video className="w-4 h-4 text-primary-400" />
          URL vidéo ou lien <span className="text-muted">(optionnel)</span>
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or Google Drive link"
            className="input-field pl-11"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-heading mb-3">
          <FileText className="w-4 h-4 text-primary-400" />
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez ce que vous avez appris, les étapes que vous avez suivies, les concepts clés que vous avez compris, et les défis que vous avez rencontrés. Soyez précis et détaillé — minimum 100 mots."
          rows={8}
          className="input-field resize-none"
        />
        <div className="flex justify-between mt-2">
          <p className={`text-xs ${wordCount >= MIN_WORDS ? 'text-accent-400' : 'text-muted'}`}>
            {wordCount >= MIN_WORDS ? (
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Nombre minimum de mots atteint</span>
            ) : (
              `${wordCount}/${MIN_WORDS} mots minimum`
            )}
          </p>
          <p className="text-xs text-muted">{wordCount} mots</p>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Soumettre la preuve
          </>
        )}
      </button>
    </form>
  );
}

