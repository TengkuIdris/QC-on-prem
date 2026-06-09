export enum SearchParamsSelect {
  PARENTO = "parento",
  FISH_BONE = "fishbone",
  WHYWHY = "whywhy",
  WEB_SAVE = "websave",
  SERVICE_SUPPORT = "service-support",
}

export interface ProductFeature {
  title: string;
  desc: string;
  image: string;
}

export interface ProductData {
  title: string;
  title_box: string;
  content: string;
  name: SearchParamsSelect;
  features: ProductFeature[];
  demoImage: string;
  demoAlt: string;
  demoSubtitle: string;
  featureSectionTitle: string;
  ctaSubtitle: string;
  metaTitle: string;
  metaDescription: string;
}

export const productDataMap: Record<SearchParamsSelect, ProductData> = {
  [SearchParamsSelect.PARENTO]: {
    title: "エクセル作業から解放！\nパレート図が3分で完成",
    title_box: "グラフ作成とエクセルはもう不要！カンタン・キレイに一発表示で効率UP✨",
    content: "",
    name: SearchParamsSelect.PARENTO,
    features: [
      {
        title: "データを入力するだけで、アプリが自動計算、作図までその場で短縮",
        desc: "複雑な計算式や作図作業は一切不要。データ入力するだけで美しいパレート図が完成します。",
        image: "/image/parento-icon.png",
      },
      {
        title: "見た目の不安を取り除く、教科書通りのレイアウト",
        desc: "エクセルで面倒だった教科書通りのレイアウトに一発で作図",
        image: "/image/parento-icon.png",
      },
      {
        title: "改善前後の比較グラフ作成も簡単",
        desc: "改善効果を視覚的に比較できる機能で、成果を明確に示すことができます。",
        image: "/image/parento-icon.png",
      },
    ],
    demoImage: "/image/pareto_introduce.gif",
    demoAlt: "パレート図サンプル",
    demoSubtitle: "データを入力するだけで、美しいパレート図が瞬時に生成されます",
    featureSectionTitle: "改善前後の比較グラフを作成する機能も搭載",
    ctaSubtitle: "パレート図作成の効率を劇的に向上させる体験をしてください",
    metaTitle: "パレート図作成ツール | エクセル作業から解放！3分で完成 | カイゼンハブ",
    metaDescription:
      "データを入力するだけで、アプリが自動計算・作図までその場で短縮。エクセルで面倒だった教科書通りのレイアウトに一発で作図。改善前後の比較グラフ作成も簡単。",
  },
  [SearchParamsSelect.FISH_BONE]: {
    title: "PowerPointの作業はもう不要！\n特性要因図が1分で完成",
    title_box: "問題解決のプロが「手放せない」と絶賛。AIが網羅的に原因を洗い出し、特性要因図を自動生成🐟",
    content: "",
    name: SearchParamsSelect.FISH_BONE,
    features: [
      { title: "わかりやすいUIで", desc: "誰でも簡単直観操作", image: "/image/fishbone.png" },
      { title: "業界初！AI搭載の特性要因図作成", desc: "", image: "/image/fishbone.png" },
      {
        title: "AIエージェントが網羅的に課題ばらしをサポート",
        desc: "AIは、出力に1分ほど要します",
        image: "/image/fishbone.png",
      },
    ],
    demoImage: "/image/fishbone_introduce.gif",
    demoAlt: "特性要因図サンプル",
    demoSubtitle: "AIが自動で特性要因図を生成します",
    featureSectionTitle: "AIによる原因分析と改善提案機能を搭載",
    ctaSubtitle: "AI搭載の特性要因図作成で、問題解決を加速させましょう",
    metaTitle: "特性要因図作成ツール | AI搭載で1分で完成 | カイゼンハブ",
    metaDescription:
      "PowerPointの作業はもう不要！AIが網羅的に原因を洗い出し、特性要因図を自動生成。問題解決のプロが「手放せない」と絶賛。わかりやすいUIで誰でも簡単直観操作。",
  },
  [SearchParamsSelect.WHYWHY]: {
    title: "AIがサポートする\nなぜなぜ分析",
    title_box: "AIと対話しながら根本原因を分析。問題解決を効率化します🤖",
    content: "",
    name: SearchParamsSelect.WHYWHY,
    features: [
      {
        title: "AIと対話して「なぜ」を深掘り",
        desc: "問題を入力すると、AIが「なぜ」を質問。対話しながら根本原因まで深掘りします。",
        image: "/image/whywhy-icon.png",
      },
      {
        title: "ツリー構造で原因を可視化",
        desc: "「なぜ」の連鎖をツリー構造で表示。原因の関係性が一目で分かります。",
        image: "/image/whywhy-icon.png",
      },
      {
        title: "対話を通じて成長できる",
        desc: "なぜなぜ分析の考え方を学びながら、分析スキルが身につきます。",
        image: "/image/whywhy-icon.png",
      },
    ],
    demoImage: "/image/whywhy_introduce.gif",
    demoAlt: "なぜなぜ分析AIサンプル",
    demoSubtitle: "AIと対話しながら根本原因を分析。分析時間を短縮し、スキルも向上します",
    featureSectionTitle: "AIによる根本原因分析機能",
    ctaSubtitle: "AIサポートのなぜなぜ分析で、問題解決を加速させましょう",
    metaTitle: "なぜなぜ分析AI | AIがサポートする根本原因分析 | カイゼンハブ",
    metaDescription:
      "AIと対話しながら根本原因を分析。問題解決を効率化します。ツリー構造で原因を可視化し、対話を通じて分析スキルも向上します。",
  },
  [SearchParamsSelect.WEB_SAVE]: {
    title: "WEB保存機能",
    title_box: "端末に依存せずいつでもどこでもアクセス可能☁",
    content: "",
    name: SearchParamsSelect.WEB_SAVE,
    features: [
      { title: "Cloud上に保存可能", desc: "どこからでもアクセス可能", image: "/image/cloud_strage_icon.png" },
      { title: "サムネイルを見て", desc: "前回の続きに迷わずアクセス", image: "/image/cloud_strage_icon.png" },
      { title: "画像データとしてローカルにも保存可能", desc: "", image: "/image/cloud_strage_icon.png" },
    ],
    demoImage: "/image/save_pareto.png",
    demoAlt: "サンプル画像",
    demoSubtitle: "クラウド上にデータを保存し、いつでもアクセス可能です",
    featureSectionTitle: "クラウド保存とデータ管理機能を搭載",
    ctaSubtitle: "クラウド保存機能で、いつでもどこでもデータにアクセス",
    metaTitle: "クラウド保存機能 | 端末に依存せずいつでもどこでもアクセス可能 | カイゼンハブ",
    metaDescription:
      "Cloud上に保存可能でどこからでもアクセス可能。サムネイルを見て前回の続きに迷わずアクセス。画像データとしてローカルにも保存可能。",
  },
  [SearchParamsSelect.SERVICE_SUPPORT]: {
    title: "改善サポート",
    title_box: "現場調査からデータ解析、改善サポートまで伴走型の支援もお任せください🚀",
    content: "",
    name: SearchParamsSelect.SERVICE_SUPPORT,
    features: [
      { title: "改善実行プラン", desc: "長年培ってきた現場力で改善をサポートいたします", image: "/image/SS.webp" },
      {
        title: "現場診断プラン",
        desc: "5ゲン主義を徹底した分析を行い、改善の方向性を示します",
        image: "/image/SS.webp",
      },
      { title: "教育プラン", desc: "品質管理、稼働率、在庫管理などの教育も承っております", image: "/image/SS.webp" },
    ],
    demoImage: "/image/Captures_kaizen_support.png",
    demoAlt: "サンプル画像",
    demoSubtitle: "実際に現場に入り改善をサポートいたします",
    featureSectionTitle: "専門家による改善サポート機能を搭載",
    ctaSubtitle: "専門家による改善サポートで、現場の問題解決をサポート",
    metaTitle: "改善サポート | 現場調査からデータ解析まで伴走型の支援 | カイゼンハブ",
    metaDescription:
      "現場調査からデータ解析、改善サポートまで伴走型の支援もお任せください。改善実行プラン、現場診断プラン、教育プランをご用意しています。",
  },
};
