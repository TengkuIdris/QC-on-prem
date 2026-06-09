[1mdiff --git a/src/pages/HomePage/FeatureCauseTool.tsx b/src/pages/HomePage/FeatureCauseTool.tsx[m
[1mindex 66eb253..54cef74 100644[m
[1m--- a/src/pages/HomePage/FeatureCauseTool.tsx[m
[1m+++ b/src/pages/HomePage/FeatureCauseTool.tsx[m
[36m@@ -102,12 +102,19 @@[m [mconst FeatureCauseTool: React.FC = () => {[m
             id="main-image" [m
             className={styles.mainImage}[m
             style={{[m
[31m-              ...data.name === SearchParamsSelect.PARENTO || data.name === SearchParamsSelect.FISH_BONE[m
[32m+[m[32m              ...data.name === SearchParamsSelect.PARENTO || data.name === SearchParamsSelect.FISH_BONE[m[41m [m
[32m+[m[32m                || data.name === SearchParamsSelect.WEB_SAVE || data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m[m
                 ? {[m
                     backgroundColor: "#fff",[m
                     position: "relative",[m
                     overflow: "hidden",[m
[31m-                    height: "550px",[m
[32m+[m[32m                    height: data.name === SearchParamsSelect.PARENTO || data.name === SearchParamsSelect.FISH_BONE[m[41m [m
[32m+[m[32m                      ? "600px"[m[41m[m
[32m+[m[32m                      : "500px",[m[41m[m
[32m+[m[32m                    minHeight: data.name === SearchParamsSelect.WEB_SAVE || data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m [m
[32m+[m[32m                      ? "500px" : "auto",[m[41m[m
[32m+[m[32m                    padding: data.name === SearchParamsSelect.WEB_SAVE || data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m [m
[32m+[m[32m                      ? "20px 0" : "0",[m[41m[m
                   }[m
                 : {},[m
               margin: "1rem 0"[m
[36m@@ -119,24 +126,41 @@[m [mconst FeatureCauseTool: React.FC = () => {[m
                   ? "/image/pareto_introduce.gif"[m
                   : data.name === SearchParamsSelect.FISH_BONE[m
                     ? "/image/fishbone_introduce.gif"[m
[31m-                    : "/image/fish_sample1.png"[m
[32m+[m[32m                    : data.name === SearchParamsSelect.WEB_SAVE[m[41m[m
[32m+[m[32m                      ? "/image/save_pareto.png"[m[41m[m
[32m+[m[32m                      : data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m[m
[32m+[m[32m                        ? "/image/Captures_kaizen_support.png"[m[41m[m
[32m+[m[32m                        : "/image/fish_sample1.png"[m[41m[m
               }[m
               alt={[m
                 data.name === SearchParamsSelect.PARENTO[m
                   ? "パレート図サンプル"[m
                   : data.name === SearchParamsSelect.FISH_BONE[m
                     ? "特性要因図サンプル"[m
[31m-                    : "サンプル画像"[m
[32m+[m[32m                    : data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m[m
[32m+[m[32m                      ? "サービスサポート"[m[41m[m
[32m+[m[32m                      : "サンプル画像"[m[41m[m
               }[m
               className={styles.mainImageContent}[m
               style={[m
                 data.name === SearchParamsSelect.PARENTO || data.name === SearchParamsSelect.FISH_BONE[m
                   ? {[m
                       maxWidth: "100%",[m
[32m+[m[32m                      maxHeight: "100%",[m[41m[m
                       position: "relative",[m
[31m-                      top: "-80px",[m
[32m+[m[32m                      top: "-50px",[m[41m[m
[32m+[m[32m                      objectFit: "contain"[m[41m[m
                     }[m
[31m-                  : {}[m
[32m+[m[32m                  : data.name === SearchParamsSelect.WEB_SAVE || data.name === SearchParamsSelect.SERVICE_SUPPORT[m[41m[m
[32m+[m[32m                    ? {[m[41m[m
[32m+[m[32m                        width: "auto",[m[41m[m
[32m+[m[32m                        maxWidth: "100%",[m[41m[m
[32m+[m[32m                        maxHeight: "100%",[m[41m[m
[32m+[m[32m                        objectFit: "contain",[m[41m[m
[32m+[m[32m                        margin: "auto",[m[41m[m
[32m+[m[32m                        display: "block"[m[41m[m
[32m+[m[32m                      }[m[41m[m
[32m+[m[32m                    : {}[m[41m[m
               }[m
             />[m
           </div>[m
