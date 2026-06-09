import { OrderByEnum } from "@/enum";
import SearchPage, { DataSearch } from "@/features/kaizen-hub/search";
import kaiZenHubService, { ImprovementListParams } from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import React, { useContext, useEffect, useState } from "react";
import { KaizenHubTabInfoContext } from "../kaizen-hub-tab";
import style from "../kaizen-hub.module.css";
import { Pagination } from "@mui/material";
import { ImprovementDetail } from "@/interfaces/improvement";

function KaizenHubTabSearch() {
  const context = useContext(KaizenHubTabInfoContext);
  if (!context) throw new Error("KaizenHubTabInfo must be used within a KaizenHubTabInfoProvider");
  const { paramsSearch, setParamsSearch } = context;
  const [data, setData] = useState<ImprovementDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalPage, setTotalPage] = useState<number>(0);
  const [search, setSearch] = useState<string>(paramsSearch.search);

  const handleSearch = async (dataSearch: DataSearch) => {
    const params: ImprovementListParams = {
      orderBy: OrderByEnum.DESC,
      ...(dataSearch.search && { title: dataSearch.search.trim() }),
      ...(dataSearch.selectedTags?.length && { label: dataSearch.selectedTags }),
      page: dataSearch.page,
    };

    setIsLoading(true);
    try {
      const [res, error] = await handleApi(kaiZenHubService.getImprovementList(params));
      if (error) {
        setData((prev) => [...prev]);
      } else {
        setData(res.data.data);
        setTotalPage(res.data.totalPage);
      }
    } catch (error) {
      setData((prev) => [...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch({
      search: paramsSearch.search || "",
      selectedTags: paramsSearch.selectedTags.length ? paramsSearch.selectedTags : [],
      page: paramsSearch.page || 1,
    });
  }, [paramsSearch]);

  useEffect(() => {
    return () => {
      setParamsSearch((prev) => ({ ...prev, page: 1 }));
    };
  }, []);

  return (
    <div className={`${style.container} ${style.containerLarge}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParamsSearch((prev) => ({
            ...prev,
            search,
            page: 1,
          }));
        }}
      >
        <section className={style.searchSection}>
          <h2 className={style.searchTitle}>
            改善のヒントを
            <br />
            「カイゼンハブ」で見つけよう
          </h2>
          <p className={style.searchDescription}>過去の改善事例を検索し、あなたのカイゼン活動に役立ててください。</p>
          <div className={style.searchBar}>
            <span className={style.searchIcon}>🔍</span>
            <input
              type="text"
              className={style.searchInput}
              placeholder="改善事例、カテゴリ、キーワードで検索..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
            <button
              className={style.searchButton}
              type="submit"
            >
              検索
            </button>
          </div>
        </section>
      </form>

      <SearchPage
        data={data}
        isLoading={isLoading}
      />

      {totalPage > 1 && (
        <Pagination
          count={totalPage}
          page={paramsSearch.page}
          onChange={(event, value) => setParamsSearch((prev) => ({ ...prev, page: value }))}
          sx={{ display: "flex", justifyContent: "center", marginTop: "16px" }}
          disabled={isLoading}
        />
      )}
    </div>
  );
}

export default KaizenHubTabSearch;
