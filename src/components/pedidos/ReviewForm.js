import { useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";

export default function ReviewForm({ pedidoId, produtoId, onReviewSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Gerar previews das imagens
  const generatePreviews = (files) => {
    const previews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target.result);
        if (previews.length === files.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 5) {
        toast.error("Máximo de 5 imagens permitidas");
        return;
      }
      setImageFiles(files);
      generatePreviews(files);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length > 5) {
        toast.error("Máximo de 5 imagens permitidas");
        return;
      }
      setImageFiles(files);
      generatePreviews(files);
    }
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (userId) => {
    const imageUrls = [];
    if (imageFiles.length === 0) return imageUrls;

    setUploading(true);
    for (const file of imageFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("review_images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        toast.error("Erro ao fazer upload da imagem.");
        setUploading(false);
        return [];
      }

      const { data: publicUrlData } = supabase.storage
        .from("review_images")
        .getPublicUrl(filePath);

      imageUrls.push(publicUrlData.publicUrl);
    }
    setUploading(false);
    return imageUrls;
  };

  const send = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Você precisa estar logado para avaliar!");
      return;
    }

    if (!produtoId && !pedidoId) {
      toast.error("É necessário selecionar um produto ou um pedido para avaliar.");
      console.error("Erro de validação: produtoId e pedidoId são nulos.", { produtoId, pedidoId });
      return;
    }

    if (!comment.trim()) {
      toast.error("Por favor, escreva um comentário!");
      return;
    }

    console.log("Dados sendo enviados para avaliação:", {
      usu_uuid: user.id,
      id_sac: produtoId,
      id_ped: pedidoId,
      nota_ava: rating,
      comentario_ava: comment,
      nome_usu: user.email,
    });

    const uploadedImageUrls = await uploadImages(user.id);
    if (imageFiles.length > 0 && uploadedImageUrls.length === 0) {
      return;
    }

    const { error } = await supabase.from("avaliacao").insert([{
      usu_uuid: user.id,
      id_sac: produtoId,
      id_ped: pedidoId || null,
      nota_ava: rating,
      comentario_ava: comment,
      nome_usu: user.email,
      imagens_ava: uploadedImageUrls,
    }]);

    if (!error) {
      toast.success("Avaliação enviada com sucesso! 🎉");
      onReviewSuccess();
      setComment("");
      setRating(5);
      setImageFiles([]);
      setImagePreviews([]);
    } else {
      console.error("Erro ao enviar avaliação:", error);
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#f8fdfb] to-[#f0faf5] p-6 rounded-2xl mt-4 border border-[#e4f4ed]">
      {/* Avaliação com Estrelas */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#264f41] mb-3">
          Sua Avaliação
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-110"
              type="button"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill={s <= rating ? "#f59e0b" : "none"}
                stroke={s <= rating ? "#f59e0b" : "#d1d5db"}
                strokeWidth="1.5"
                className="cursor-pointer"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Comentário */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#264f41] mb-2">
          Seu Comentário
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 border-2 border-[#e4f4ed] rounded-xl text-sm focus:outline-none focus:border-[#3ca779] focus:ring-2 focus:ring-[#3ca779]/20 transition-all resize-none"
          placeholder="Compartilhe sua experiência com este produto..."
          rows="4"
        />
        <p className="text-xs text-[#6b9e8a] mt-1">
          {comment.length}/500 caracteres
        </p>
      </div>

      {/* Dropzone para Imagens */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#264f41] mb-3">
          Adicionar Fotos (Opcional)
        </label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-[#3ca779] bg-[#e8f5f0]"
              : "border-[#c8e3d5] bg-white hover:bg-[#f8fdfb]"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3ca779"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
              />
            </svg>
            <p className="text-sm font-semibold text-[#264f41]">
              Arraste imagens aqui ou clique para selecionar
            </p>
            <p className="text-xs text-[#6b9e8a]">
              PNG, JPG ou WEBP (Máximo 5 imagens)
            </p>
          </div>
        </div>
      </div>

      {/* Preview das Imagens */}
      {imagePreviews.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#264f41] mb-3">
            {imagePreviews.length} imagem{imagePreviews.length > 1 ? "s" : ""} selecionada{imagePreviews.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden shadow-sm"
              >
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Envio */}
      <button
        onClick={send}
        disabled={uploading || !comment.trim()}
        className="w-full bg-gradient-to-r from-[#3ca779] to-[#2e8f65] text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Enviando...
          </>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            Enviar Avaliação
          </>
        )}
      </button>
    </div>
  );
}
