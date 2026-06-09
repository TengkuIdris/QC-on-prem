import { RelatedDocument } from "@/interfaces/improvement";
import React, { useEffect, useState } from "react";
import style from "../pages/kaizen-hub/kaizen-hub.module.css";
import { useParams } from "react-router-dom";

const useRenderImage = (relatedDocuments: RelatedDocument[]) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImagesFailed, setAllImagesFailed] = useState(false);
  const { id } = useParams();

  useEffect(() => {
    setCurrentImageIndex(0);
    setAllImagesFailed(false);
  }, [relatedDocuments]);

  const renderImage = ({
    classNameImage,
    classImageError,
  }: { classNameImage?: string; classImageError?: string } = {}) => {
    const handleImageError = () => {
      const nextIndex = currentImageIndex + 1;
      if (nextIndex < relatedDocuments.length) {
        setCurrentImageIndex(nextIndex);
      } else {
        setAllImagesFailed(true);
      }
    };

    if (relatedDocuments.length === 0) {
      return <div className={`${style.noImage} ${classNameImage} ${classImageError}`} />;
    }

    if (allImagesFailed) {
      return <div className={`${style.noImage} ${classNameImage} ${classImageError}`} />;
    }

    if (currentImageIndex >= relatedDocuments.length) {
      return <div className={`${style.noImage} ${classNameImage} ${classImageError}`} />;
    }

    const currentDocument = relatedDocuments[currentImageIndex];

    if (!currentDocument?.url) {
      handleImageError();
      return <div className={`${style.noImage} ${classNameImage} ${classImageError}`} />;
    }

    return (
      <img
        src={currentDocument.url}
        alt={`関連画像 ${currentImageIndex + 1}/${relatedDocuments.length}: ${currentDocument.name || "無題"}`}
        className={`${style.recipeCardImage} ${id && "!h-auto"} ${classNameImage || ""}`}
        onError={handleImageError}
        onLoad={() => {
          if (allImagesFailed) {
            setAllImagesFailed(false);
          }
        }}
      />
    );
  };

  return { renderImage };
};

export default useRenderImage;
