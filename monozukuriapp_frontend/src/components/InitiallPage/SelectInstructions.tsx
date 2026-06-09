import { SearchParamsSelect } from "@/pages/ProductPage/productData";
import React from "react";
import { useNavigate } from "react-router-dom";

const SelectInstructions = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="block">
        <button
          className="flex bg-[#0066CC] text-white my-2 p-4 w-[45%] rounded-md hover:opacity-[0.7]"
          onClick={() => navigate(`/feature-cause-tool?tool=${SearchParamsSelect.PARENTO}`)}
        >
          <img
            src="/image/parento-icon.png"
            alt="parento-icon"
            className="bg-white w-[24px] h-[24px] mr-3"
          />
          <span>パレート図作成</span>
        </button>
        <button
          className="flex bg-[#0066CC] text-white my-2 p-4 w-[45%] rounded-md hover:opacity-[0.7]"
          onClick={() => navigate(`/feature-cause-tool?tool=${SearchParamsSelect.FISH_BONE}`)}
        >
          <img
            src="/image/fishbone.png"
            alt="fishbone"
            className="bg-white w-[24px] h-[24px] mr-3"
          />
          <span>特性要因図作成</span>
        </button>
        <button
          className="flex bg-[#0066CC] text-white my-2 p-4 w-[45%] rounded-md hover:opacity-[0.7]"
          onClick={() => navigate(`/feature-cause-tool?tool=${SearchParamsSelect.WHY}`)}
        >
          <img
            src="/image/question-sign.png"
            alt="question-sign"
            className="bg-white w-[24px] h-[24px] mr-3"
          />
          <span>なぜなぜ作成</span>
        </button>
        <button
          className="flex bg-[#0066CC] text-white my-2 p-4 w-[45%] rounded-md hover:opacity-[0.7]"
          onClick={() => navigate(`/feature-cause-tool?tool=${SearchParamsSelect.FTA}`)}
        >
          <img
            src="/image/fta.png"
            alt="fta"
            className="bg-white w-[24px] h-[24px] mr-3"
          />
          <span>FTA作成</span>
        </button>
      </div>
    </>
  );
};
export default SelectInstructions;
