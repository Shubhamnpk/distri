import type { Company, Project, Source } from './types'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function companySlug(c: Company): string {
  return slugify(c.name)
}

export function projectSlug(p: Project): string {
  return slugify(p.name)
}

export const companies: Company[] = [
  {
    "name": "Nepal Electricity Authority",
    "sector": "Energy & utilities",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "125.74B",
    "result": "6.44B",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXUB1yU3Ys0vD7S9NNpq0sx6oLGhqkhAy-wvVCBNm_8g&s=10",
    "note": "FY 2081/82 figures from the Ministry of Finance public-enterprise tables. Revenue is operating income; result is reported net profit/loss. NPR lakh values converted to NPR billion.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Telecom",
    "sector": "Telecommunications",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "34.43B",
    "result": "6.01B",
    "resultType": "up",
    "ownership": "91.49% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF 2083 review / Nepal Telecom audited statements",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://ntc.net.np/_nuxt/img/logo.6aa152d.png",
    "note": "Ministry review gives operating income and net result for FY 2081/82; the standalone audited profit is NPR 6.007B. Government owns 91.49%.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Citizen Investment Trust",
    "sector": "Financial services",
    "year": "FY 2022/23",
    "revenue": "Unavailable",
    "result": "3.85B",
    "resultType": "up",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of PEs",
    "sourceUrl": "https://mof.gov.np/",
    "logo": "https://www.nlk.org.np/media/setting/nlk-logo_9i3fQp9bF5.png",
    "note": "Among the five most profitable public enterprises in the MoF FY 2022/23 review.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "1.0B",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "0.9B",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Rastriya Banijya Bank",
    "sector": "Banking & finance",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "27.31B",
    "result": "2.84B",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://www.rbb.com.np/frontend/images/favicon_rbb.png",
    "note": "FY 2081/82 operating income and net profit from the Ministry review. Bank income is sector-specific and should not be compared directly with industrial sales.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Oil Corporation",
    "sector": "Trade & supply",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "366.05B",
    "result": "13.68B",
    "resultType": "up",
    "ownership": "99.46% Government of Nepal; 0.54% other state-owned enterprises",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083 / NOC audited statements",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://www.noc.org.np/nepal-oil.jpg",
    "note": "FY 2081/82 Ministry table. NOC states that 99.46% is held by GoN and the rest by four state-owned enterprises. Revenue is operating income, not profit; high turnover reflects petroleum trading.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Salt Trading Corporation",
    "sector": "Trade & supply",
    "year": "FY 2023/24",
    "revenue": "3.31B",
    "result": "Dividend 320M",
    "resultType": "up",
    "operatingStatus": "Operating",
    "source": "STC 58th Annual Report / Republica",
    "sourceUrl": "https://stcnepal.com/",
    "logo": "https://en.wikipedia.org/wiki/Special:FilePath/Salt_Trading_Corporation,_Nepal.png",
    "note": "Sole national salt supplier (PPP, 11.5% GoN). Paid-up capital Rs 32.07M; distributed Rs 320.7M total dividend from FY 2023/24 profit. Audit qualified opinion for FY 2022/23 (profit before tax Rs 90.8M) flagged control over subsidiaries.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "820M",
        "result": "Dividend 80M",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "830M",
        "result": "Dividend 80M",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Deposit and Credit Guarantee Fund",
    "sector": "Financial services",
    "year": "FY 2082/83 (2025/26; unaudited Q4)",
    "revenue": "4.82B",
    "result": "3.91B",
    "resultType": "up",
    "operatingStatus": "Operating",
    "source": "DCGF unaudited 4th-quarter financial statement, FY 2082/83",
    "sourceUrl": "https://dcgf.gov.np/uploads/report/1787132325_1.%20Final%20DCGF%204th%20Quarter%20Financial.pdf",
    "logo": "https://dcgf.gov.np/front/dcgf-backup-img.jpg",
    "note": "The official unaudited Q4 statement reports full-year net profit after tax of NPR 3,906,693,887 (about NPR 3.91B) and operating income of NPR 4,817,393,558 (about NPR 4.82B) for FY 2082/83. Q4 alone net profit was NPR 1,025,098,664 (about NPR 1.03B).",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "1.03B",
        "state": "Done"
      }
    ]
  },
  {
    "name": "Civil Aviation Authority of Nepal",
    "sector": "Aviation",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "14.70B",
    "result": "2.26B",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://caanepal.gov.np/themes/caan-main-website-theme/assets/images/Civil_Aviation_Authority_of_Nepal.png",
    "note": "Latest Ministry operating income and net profit. CAAN remains among the leading contributors to accumulated PE profits, though annual results can vary.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Airlines Corporation",
    "sector": "Transport",
    "year": "FY 2022/23",
    "revenue": "Unavailable",
    "result": "-652.9M",
    "resultType": "down",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of PEs",
    "sourceUrl": "https://mof.gov.np/",
    "logo": "https://www.nepalairlines.com.np/frontend/img/logo_sticky_2x.png",
    "note": "Persistent loss-maker; among the highest losses in the FY 2022/23 MoF review. Fleet downsized to two operational aircraft in 2025.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Water Supply Corporation",
    "sector": "Water & sanitation",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "854.29M",
    "result": "-507.93M",
    "resultType": "down",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://giwmscdnone.gov.np/media/logo/nwsc%20logo_pnm5xf7.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "FY 2081/82 Ministry table; operating income and net loss converted from NPR lakh.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Dairy Development Corporation",
    "sector": "Food & agriculture",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "4.00B",
    "result": "-402.97M",
    "resultType": "down",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://www.ddc.gov.np/logo192.png",
    "note": "Latest Ministry operating income and net loss converted from NPR lakh.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Udayapur Cement Industries",
    "sector": "Manufacturing",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "145.01M",
    "result": "-250.05M",
    "resultType": "down",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://www.ucil.org.np/assets/images/logo.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Latest Ministry operating income and net loss converted from NPR lakh. The loss exceeded operating income.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Hetauda Cement Industry",
    "sector": "Manufacturing",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "163.03M",
    "result": "-319.20M",
    "resultType": "down",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://baardali.org.np/wp-content/uploads/2022/07/logo-1-150x150.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Latest Ministry operating income and net loss converted from NPR lakh. The loss exceeded operating income.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Metals Company",
    "sector": "Manufacturing",
    "year": "Closed",
    "revenue": "N/A",
    "result": "N/A",
    "resultType": "down",
    "operatingStatus": "Closed",
    "source": "MoF Annual Status Review of PEs FY 2024/25",
    "sourceUrl": "https://mof.gov.np/",
    "note": "Remains closed per the MoF FY 2024/25 review, but administrative expenses continue in the absence of business activity.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Butwal Spinning Mill",
    "sector": "Textiles",
    "year": "Closed",
    "revenue": "N/A",
    "result": "N/A",
    "resultType": "down",
    "operatingStatus": "Closed",
    "source": "MoF Annual Status Review of PEs FY 2024/25",
    "sourceUrl": "https://mof.gov.np/",
    "note": "Remains closed per the MoF FY 2024/25 review; still draws administrative expense despite no operations.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Orind Magnesite Pvt Ltd",
    "sector": "Mining & minerals",
    "year": "Closed",
    "revenue": "N/A",
    "result": "N/A",
    "resultType": "down",
    "operatingStatus": "Closed",
    "source": "MoF Annual Status Review of PEs FY 2024/25",
    "sourceUrl": "https://mof.gov.np/",
    "note": "Remains closed per the MoF FY 2024/25 review (listed as Orind Magnesite). Administrative expenses continue.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Dhaubadi Iron Company",
    "sector": "Mining & minerals",
    "year": "Not started",
    "revenue": "N/A",
    "result": "N/A",
    "resultType": "down",
    "operatingStatus": "Closed",
    "source": "MoF Annual Status Review of PEs FY 2024/25",
    "sourceUrl": "https://mof.gov.np/",
    "note": "Has not started commercial operations per the MoF FY 2024/25 review - Nepal's first iron mine project, in Nawalparasi.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q2",
        "revenue": "N/A",
        "result": "N/A",
        "state": "Done"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not published",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Krishi Samagri Company",
    "sector": "Trade & supply",
    "year": "Ownership verified 2025/26",
    "revenue": "Unavailable",
    "result": "Not reported",
    "resultType": "unknown",
    "operatingStatus": "Operating",
    "source": "Official company profile / annual report",
    "logo": "https://giwmscdnone.gov.np/media/members/profile_20250314200422_hbeuuos.jpg",
    "sourceUrl": "https://www.kscl.gov.np/pages/introduction/",
    "note": "Government-owned fertilizer importer and distributor. The company states it is fully government-owned and incorporates the former National Seeds Company after their merger. Latest comparable audited revenue and net result are not included here.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Agricultural Development Bank",
    "sector": "Banking & finance",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "23.53B",
    "result": "3.63B",
    "resultType": "up",
    "ownership": "51% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF 2083 review / ADBL Annual Report",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://adbl.gov.np/favicon.ico",
    "note": "Operating income and net profit from the MoF FY 2081/82 table; ADBL annual report confirms the Governmentâ€™s 51% share. Banking income is not directly comparable with industrial sales.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Bank Limited",
    "sector": "Banking & finance",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "23.65B",
    "result": "3.07B",
    "resultType": "up",
    "ownership": "51% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF 2083 review / Nepal Bank capital structure",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://rpcdn.ratopati.com/media/albums/nepal_bank_XSzXs1X6ib.jpg",
    "note": "Operating income and net profit from the MoF FY 2081/82 table. The bankâ€™s published capital structure lists GoN ownership at 51%.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Industrial District Management Limited",
    "sector": "Industry & infrastructure",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "1.70B",
    "result": "17.11M",
    "resultType": "up",
    "ownership": "99.69% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF 2083 review / IDML",
    "logo":"https://giwmscdnone.gov.np/media/members/profile_20250419170348_txrbpkn.jpg",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Manages Nepalâ€™s government industrial estates. MoF FY 2081/82 operating income and net profit converted from NPR lakh.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Herbs Production and Processing Company",
    "sector": "Manufacturing & health",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "122.98M",
    "result": "-66.32M",
    "resultType": "down",
    "ownership": "99.14% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://hppcl.com.np/wp-content/themes/WPSTARTER/pagoda_s/img/logo/logo-white.png",
    "note": "Government-majority medicinal and aromatic plant processor. Latest MoF operating income and net loss for FY 2081/82.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Aushadhi Limited",
    "sector": "Pharmaceuticals",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "69.75M",
    "result": "-100.39M",
    "resultType": "down",
    "ownership": "99.07% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "State-owned medicines manufacturer. MoF reports operating income and net loss for FY 2081/82.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Food Management and Trading Company",
    "sector": "Food security & trade",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "1.92B",
    "result": "34.50M",
    "resultType": "up",
    "ownership": "98.62% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://nepalfoods.gov.np/u/fmtc-logo-64708133d4325.jpg",
    "note": "Public food procurement and distribution enterprise. Latest Ministry operating income and net profit.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Ban Nigam",
    "sector": "Forestry & trade",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "1.92B",
    "result": "19.27M",
    "resultType": "up",
    "ownership": "Government majority (public enterprise)",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://suchanaa.com/media/filer_public/47/01/4701d226-d678-4ff5-af65-5184fbe2871a/nepal_ban_nigam_limited_logo.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "State-controlled timber trading enterprise. Latest operating income and net profit in the Ministry review; ownership is presented as government majority because the MoF summary does not state a single direct percentage.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Transport and Warehouse Management Company",
    "sector": "Transport & logistics",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "267.68M",
    "result": "85.79M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://www.nepaltransit.gov.np/assets/images/sitelogo/logo/60925.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Government logistics and warehouse operator. FY 2081/82 operating income and net profit from the MoF table.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Gorkhapatra Corporation",
    "sector": "Media & publishing",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "697.34M",
    "result": "156.46M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://en.wikipedia.org/wiki/Special:FilePath/Gorkhapatra.svg",
    "note": "State-owned publishing corporation. Operating income and net profit from the latest Ministry table.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Janak Education Materials Centre",
    "sector": "Education & publishing",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "1.72B",
    "result": "134.54M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo":"https://giwmscdnone.gov.np/media/logo/logo-Picsart-AiImageEnhancer_ryiybgo.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Produces school textbooks and learning materials. Latest Ministry operating income and net profit.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Housing Company",
    "sector": "Housing & real estate",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "34.92M",
    "result": "-19.92M",
    "resultType": "down",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "State-owned housing development entity. FY 2081/82 operating income and net loss from the Ministry review.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Janakpur Cigarette Factory",
    "sector": "Manufacturing",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "5.25M",
    "result": "1.25M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Closed",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo":"https://npcdn.ratopati.com/media/news/janakpur_churot_karkhana-(1)_s04HYgkf5r.jpg",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Factory is closed. The Ministry review reports a small positive net result, but does not disclose the income line that produced it; do not read this as cigarette-manufacturing profit.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Public Service Broadcasting Nepal",
    "sector": "Media & broadcasting",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "243.30M",
    "result": "-133.54M",
    "resultType": "down",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "logo": "https://ntv.org.np/wp-content/uploads/2020/08/logo.png",
    "note": "Listed as the public broadcasting institution in the current Ministry review; it consolidates the state broadcasting structure represented by Nepal Television and Radio Nepal.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Cultural Corporation",
    "sector": "Culture & performing arts",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "57.75M",
    "result": "2.88M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://www.sanskritiksansthan.gov.np/assets/images/favicon.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "State cultural institution. FY 2081/82 operating income and net profit from the Ministry review.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Nepal Purwadhar Nirman Company",
    "sector": "Infrastructure & construction",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "117.55M",
    "result": "38.85M",
    "resultType": "up",
    "ownership": "100% Government of Nepal",
    "operatingStatus": "Operating",
    "source": "MoF Annual Status Review of Public Institutions 2083",
    "logo": "https://www.npncl.gov.np/image/logo/logo_en.png",
    "sourceUrl": "https://mof.gov.np/content/1739/annual-status-review-of-public-institutions-2083/",
    "note": "Government construction company. FY 2081/82 figures reported by the Ministry of Finance.",
    "quarters": [
      {
        "label": "Q1",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q2",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q3",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      },
      {
        "label": "Q4",
        "revenue": "Unavailable",
        "result": "Not reported",
        "state": "Unknown"
      }
    ]
  },
  {
    "name": "Employees Provident Fund (Karmachari Sanchaya Kosh)",
    "entityType": "Statutory public fund",
    "sector": "Statutory funds",
    "year": "Statutory institution · established 2019 BS",
    "revenue": "Not comparable",
    "result": "Not applicable",
    "resultType": "unknown",
    "ownership": "Autonomous statutory public fund; government shareholding percentage is not applicable.",
    "operatingStatus": "Operating",
    "source": "Employees Provident Fund Act, 2019 / official EPF profile",
    "sourceUrl": "https://epf.org.np/np/about-us/",
    "logo": "https://epf.org.np/wp-content/themes/geoinfra/assets/images/myLogo.svg",
    "note": "Established by the Employees Provident Fund Act, 2019 as an autonomous statutory institution. Its relationship with the Government of Nepal is through the Ministry of Finance. It administers retirement savings for government, public-enterprise and private-sector employees; member contributions are not company revenue or government-owned equity.",
    "quarters": [
      { "label": "Q1", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" }
    ]
  },
  {
    "name": "Health Insurance Board (HIB)",
    "entityType": "Statutory public fund",
    "sector": "Statutory funds",
    "year": "Statutory board · Health Insurance Act 2074 · FY 2082/83 report published",
    "revenue": "Not comparable",
    "result": "Not applicable",
    "resultType": "unknown",
    "ownership": "Autonomous statutory public board and health-insurance fund; shareholding does not apply.",
    "operatingStatus": "Operating",
    "source": "Health Insurance Act, 2074 / HIB FY 2082/83 fourth-quarter report page",
    "sourceUrl": "https://www.hib.gov.np/content/350/details-of-the-fourth-quarter-report-for/",
    "note": "The Board administers Nepal’s public health-insurance programme under the Health Insurance Act, 2074. Premium contributions and government grants fund the programme; they are not commercial sales or company profit. Track contributions, claims paid, government funding and fund balance instead.",
    "publicFundFinancials": [
      {
        "year": "FY 2081/82",
        "contributions": "3.732B",
        "claimsSubmitted": "23.817B",
        "source": "Health Insurance Board Annual Report FY 2081/82, contribution and provider-claim tables",
        "sourceUrl": "https://giwmscdnone.gov.np/media/pdf_upload/Annual_Report_2081_82_lqescgp.pdf",
        "note": "The report records NPR 3.732B in contributions and NPR 23.817B in claims submitted by provider institutions. Claims submitted are not the same as claims paid; audited income, expenses and year-end assets are not transcribed here."
      }
    ],
    "quarters": [
      { "label": "Q1", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" }
    ]
  },
  {
    "name": "Social Security Fund (SSF)",
    "entityType": "Statutory public fund",
    "sector": "Statutory funds",
    "year": "Statutory fund · established 2067 BS; governed by Act 2074",
    "revenue": "Not comparable",
    "result": "Not applicable",
    "resultType": "unknown",
    "ownership": "Statutory public fund; it has contributors and public oversight, not company shareholders.",
    "operatingStatus": "Operating",
    "source": "Contribution-Based Social Security Act, 2074 / Social Security Fund official reports",
    "sourceUrl": "https://ssf.gov.np/list/annual-reports",
    "note": "The Fund collects employer and worker contributions, invests fund assets and administers health, maternity, accident, disability, old-age, dependent-family and unemployment benefits. Contributions are member funds, not company sales or profit; track contributions, benefits paid, expenses and fund assets instead.",
    "publicFundFinancials": [
      {
        "year": "FY 2080/81",
        "contributions": "2.149B",
        "investmentIncome": "7.348B",
        "operatingIncome": "10.681B",
        "benefitsPaid": "761.4M",
        "operatingExpenses": "955.5M",
        "annualSurplus": "9.726B",
        "totalAssets": "98.260B",
        "fundReserves": "97.929B",
        "source": "Social Security Fund Annual Report FY 2080/81, annual income and expenditure and balance sheet",
        "sourceUrl": "https://ssf.gov.np/images/news/17341115869884_Annual%20report%202080-81.pdf",
        "note": "The latest annual financial report currently listed by SSF is FY 2080/81. Annual surplus is fund-accounting surplus, not company profit. Total operating income includes contributions, interest income and welfare-fund income."
      }
    ],
    "quarters": [
      { "label": "Q1", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" }
    ]
  },
  {
    "name": "Nepal Stock Exchange (NEPSE)",
    "sector": "Financial services",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "3.40B",
    "result": "1.80B",
    "resultType": "up",
    "ownership": "Government of Nepal 58.66%; Rastriya Banijya Bank 11.23%; EPF 10%; NRB 9.50%; Prabhu Bank 5%; Laxmi Sunrise Bank 5%; other 0.61% (NEPSE Restructuring Report 2082).",
    "operatingStatus": "Operating",
    "source": "NEPSE Restructuring Report 2082 (financial statements for FY 2081/82)",
    "logo": "https://www.nepalstock.com/assets/img/logo.png",
    "sourceUrl": "https://giwmscdntwo.gov.np/media/pdf_upload/%E0%A4%A8%E0%A5%87%E0%A4%AA%E0%A5%8D%E0%A4%B8%E0%A5%87%20%E0%A4%AA%E0%A5%81%E0%A4%A8%E0%A4%B0%E0%A5%8D%E0%A4%B8%E0%A4%82%E0%A4%B0%E0%A4%9A%E0%A4%A8%E0%A4%BE%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%A4%E0%A4%BF%E0%A4%B5%E0%A5%87%E0%A4%A6%E0%A4%A8_2ditykp.pdf",
    "note": "FY 2081/82 total income was NPR 3.40B, total expenses NPR 960M, and net profit after tax NPR 1.80B. The report's total income includes operating and investment income; it is shown in the revenue field as the closest reported equivalent.",
    "annualFinancials": [
      { "year": "FY 2077/78", "result": "1.4097B", "source": "NEPSE Restructuring Report 2082, net-profit chart", "note": "Net profit after tax, reported in the five-year chart; annual revenue not transcribed here." },
      { "year": "FY 2078/79", "result": "1.1781B", "source": "NEPSE Restructuring Report 2082, net-profit chart", "note": "Net profit after tax, reported in the five-year chart; annual revenue not transcribed here." },
      { "year": "FY 2079/80", "result": "818.7M", "source": "NEPSE Restructuring Report 2082, net-profit chart", "note": "Net profit after tax, reported in the five-year chart; annual revenue not transcribed here." },
      { "year": "FY 2080/81", "revenue": "2.84B", "result": "1.0137B", "source": "NEPSE Restructuring Report 2082", "note": "Operating income: NPR 2.74B from securities transactions plus NPR 94.5M from services. Net profit after tax is from the five-year chart. The report separately records NPR 563.3M in non-operating investment income." },
      { "year": "FY 2081/82", "revenue": "3.40B", "result": "1.80B", "source": "NEPSE Restructuring Report 2082", "note": "Total income includes operating and investment income." }
    ],
    "quarters": [
      { "label": "Q1", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" }
    ]
  },
  {
    "name": "CDS and Clearing Limited (CDSC)",
    "sector": "Financial services",
    "year": "FY 2081/82 (2024/25)",
    "revenue": "1.32B",
    "result": "759.5M",
    "resultType": "up",
    "ownership": "49.07% Government of Nepal; 50.93% Nepal Stock Exchange",
    "operatingStatus": "Operating",
    "source": "CDSC 15th Annual Report FY 2081/82",
    "sourceUrl": "https://cdsc.com.np/index.php/publication",
    "note": "FY 2081/82 total income was NPR 1.32B and net profit NPR 759.5M. CDSC also collected NPR 18.19B in capital-gains tax, TDS and windfall-gains tax for the Government; that pass-through tax collection is not CDSC company revenue. Mero Share is a CDSC service, not a separate company.",
    "annualFinancials": [
      { "year": "FY 2080/81", "result": "458.2M", "source": "CDSC Annual Report FY 2080/81; FY comparison reported in Fiscal Nepal", "sourceUrl": "https://cdsc.com.np/index.php/publication", "note": "Net profit; comparable revenue figure was not confirmed from the available report text." },
      { "year": "FY 2081/82", "revenue": "1.32B total income", "result": "759.5M", "source": "CDSC 15th Annual Report FY 2081/82", "sourceUrl": "https://cdsc.com.np/index.php/publication", "note": "Company income and profit. NPR 18.19B in tax collected for Government is excluded." }
    ],
    "quarters": [
      { "label": "Q1", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not reported", "result": "Not reported", "state": "Unknown" }
    ]
  },
  {
    "name": "Securities Board of Nepal (SEBON)",
    "entityType": "Statutory public regulator",
    "sector": "Financial services",
    "year": "FY 2081/82 annual report; statutory regulator",
    "revenue": "Not comparable",
    "result": "Not applicable",
    "resultType": "unknown",
    "ownership": "Autonomous statutory public regulator; not a shareholding company.",
    "operatingStatus": "Operating",
    "source": "SEBON Annual Report FY 2081/82",
    "sourceUrl": "https://www.sebon.gov.np/uploads/2025/12/31/FDIIz6hvv9Y0gsLIhLOiTwwtCroHO550wLKnde7M.pdf",
    "note": "Established by the Government of Nepal to regulate securities markets. Government grants and regulatory fees fund its work; company-style profit and ownership percentages do not apply.",
    "quarters": [
      { "label": "Q1", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q2", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q3", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" },
      { "label": "Q4", "revenue": "Not comparable", "result": "Not applicable", "state": "Unknown" }
    ]
  }
]

export const PROJECT_FX_NOTE = 'USD-denominated project figures are shown in रु using the Nepal Rastra Bank buying rate of रु 151.95 per USD on 15 Oct 2026.'
export const PROJECT_FX_SOURCE = 'https://www.nrb.org.np/forex/'

export const projects: Project[] = [
  {
    "name": "Kathmandu-Terai/Madhes Expressway",
    "ministry": "Nepali Army / MoPIT",
    "location": "Khokana (Lalitpur) â†’ Nijgadh (Bara)",
    "province": "National",
    "budget": "211.93B",
    "progress": 48.72,
    "status": "Delayed",
    "category": "Highway",
    "description": "Nepalâ€™s first expressway - 72.5 km high-speed corridor shaving Kathmandu-Terai travel to ~1 hour. Army-built since 2019 in 13 packages; stalled at the Khokana starting-point land dispute.",
    "updated": "FY 2082/83",
    "spent": "92.68B",
    "target": "FY 2083/84 (extension pending)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://assets-cdn.kathmandupost.com/uploads/source/news/2026/news/main-1769777905.jpg",
    "changeLog": [
      {
        "date": "FY 2082/83",
        "field": "Completion forecast",
        "from": "Apr 2027 (original target)",
        "to": "FY 2029/30 (Army internal estimate)",
        "source": "Project update record; revised official target not confirmed",
        "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
        "note": "The project tracker still lists FY 2083/84 as the target pending an official extension; this log preserves the separate Army internal estimate."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ],
    "updates": [
      {
        "date": "26 Jul 2026",
        "title": "49% physical - 12 of 13 packages started",
        "type": "Update",
        "text": "Progress 48.72% physical / 50.63% financial mid-Jul 2026. Khokana starting-point land dispute unresolved; Army estimates ~3 more years beyond Apr 2027 deadline."
      },
      {
        "date": "14 Jul 2026",
        "title": "Alert - Khokana land compensation pending",
        "type": "Alert",
        "text": "NPC Annual Review flagged Bagmati section land compensation as blocking milestone. No court resolution yet."
      },
      {
        "date": "30 Jan 2026",
        "title": "Towering bridges rise over Makawanpur tunnels",
        "type": "News",
        "text": "Kathmandu Post photo-essay: 6 major bridges launched, 4 tunnels breakthrough completed."
      },
      {
        "date": "Apr 2027",
        "title": "Target at risk - 3-year overrun estimate",
        "type": "Milestone",
        "text": "Original Apr 2027 target flagged â€œat riskâ€ by Nepali Army. New internal estimate: FY 2029/30."
      }
    ]
  },
  {
    "name": "Budhigandaki Hydropower (1,200 MW)",
    "ministry": "Ministry of Energy, Water Resources & Irrigation",
    "location": "Dhading-Gorkha (Budhigandaki River)",
    "province": "Gandaki",
    "budget": "406B",
    "progress": 16.55,
    "status": "At risk",
    "category": "Hydropower",
    "description": "263 m-high storage dam - the countryâ€™s largest reservoir - to generate 3.38 TWh/yr and tame floods near Kathmanduâ€™s load centre.",
    "updated": "FY 2082/83",
    "spent": "42.8B",
    "target": "FY 2092/93 (NPC estimate)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Budhi_Gandaki%2C_Yaru_Bagar_to_Jagat%2C_Gorkha_District%2C_Manaslu_Trek%2C_Nepal_%2832019507937%29.jpg",
    "gallery": [
      "https://upload.wikimedia.org/wikipedia/commons/e/ed/Budhi_Gandaki%2C_Yaru_Bagar_to_Jagat%2C_Gorkha_District%2C_Manaslu_Trek%2C_Nepal_%2832019507937%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/28/Upper_Tamakoshi_Access_Tunnel.jpg"
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ],
    "updates": [
      {
        "date": "05 Jun 2026",
        "title": "Financing modality approved - 30/70",
        "type": "Milestone",
        "text": "Government approved 30% equity / 70% concessional debt Feb-Mar 2026. Main works tender pre-qual targeted Jan 2028."
      },
      {
        "date": "18 Mar 2026",
        "title": "Land acquisition 96% - रु 45B paid",
        "type": "Update",
        "text": "96% land acquired in Dhading-Gorkha; रु 45B compensation disbursed, resettlement camps under construction."
      },
      {
        "date": "12 Jan 2026",
        "title": "Lot 1 tender - camp & access road",
        "type": "News",
        "text": "Budhigandaki Company floated Lot 1: access road, bridge & camp facilities. Bids due Apr 2026."
      },
      {
        "date": "18 Aug 2024",
        "title": "Alert - funding gap flagged by OAG",
        "type": "Alert",
        "text": "62nd OAG report flagged unsecured debt financing as key risk to 2028 main works start."
      }
    ]
  },
  {
    "name": "Mid-Hill (Pushpalal) Highway",
    "ministry": "Department of Roads",
    "location": "Chiyobhanjyang (Panchthar) â†’ Jhulaghat (Baitadi)",
    "province": "National",
    "budget": "84.3B",
    "progress": 84.68,
    "status": "At risk",
    "category": "Highway",
    "description": "1,879 km mid-hills lifeline linking 215 settlements in 26 hill districts. Began 2007; cost more than doubled from रु 33.36B as deadlines slipped twice.",
    "updated": "FY 2082/83",
    "spent": "73.6B",
    "target": "BS 2084/85 (extended)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Budhi_Gandaki%2C_Yaru_Bagar_to_Jagat%2C_Gorkha_District%2C_Manaslu_Trek%2C_Nepal_%2832019507937%29.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Postal Highway (Hulaki Rajmarg)",
    "ministry": "Department of Roads",
    "location": "Bhadrapur (Jhapa) â†’ Daiji (Kanchanpur)",
    "province": "National",
    "budget": "101.93B",
    "progress": 75.41,
    "status": "At risk",
    "category": "Highway",
    "description": "1,875 km Terai artery with 35 feeder roads to the Indian border, serving 8 million people across 21 Madhesh districts.",
    "updated": "FY 2082/83",
    "spent": "73.38B",
    "target": "FY 2086/87 (NPC estimate)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Madan Bhandari Highway",
    "ministry": "Department of Roads",
    "location": "Damak (Jhapa) â†’ Rupandehi (Inner Terai)",
    "province": "National",
    "budget": "75B",
    "budgetNote": "Approximate Department of Roads estimate from 2022 for the full 1,390 km alignment; not a current audited contract ceiling.",
    "progress": 53,
    "status": "Delayed",
    "category": "Highway",
    "description": "740 km Inner Terai highway stitching Siwalik foothills east-west - strategic road, not NPP, but tracked for coverage.",
    "updated": "27 May 2026",
    "spent": "38B",
    "spentNote": "Reported through June 2025 for the 740 km under the DoR project directorate only; partial for the full 1,390 km route.",
    "target": "Not reported",
    "source": "Department of Roads - Madan Bhandari Highway (NH 09)",
    "sourceUrl": "https://dor.gov.np/mabhpd/notice/force/madan-bhandari-highway-nh-09",
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Madan_Bhandari_Highway_NH09_Route_Map.jpg",
    "changeLog": [
      {
        "date": "2022 (DoR page dated 2078-10-13 BS)",
        "field": "Estimated project cost",
        "from": "Unavailable",
        "to": "रु 75B (approx. DoR estimate)",
        "source": "Department of Roads - Madan Bhandari Highway (NH 09)",
        "sourceUrl": "https://dor.gov.np/mabhpd/notice/force/madan-bhandari-highway-nh-09",
        "note": "DoR labels this an approximate estimate. Its page describes a 1,390 km alignment, with about 740 km implemented by the project directorate and the rest by other offices; treat this as a broad historical estimate, not a current audited contract ceiling."
      },
      {
        "date": "Jun 2025",
        "field": "Cumulative expenditure (directorate scope)",
        "from": "Unavailable",
        "to": "रु 38B (partial; 740 km under the DoR project directorate)",
        "source": "Kathmandu Post, citing the Madan Bhandari Highway Project Director",
        "sourceUrl": "https://kathmandupost.com/national/2025/06/13/delays-budget-shortfalls-plague-sindhuli-hetauda-section-of-madan-bhandari-highway",
        "note": "The project director reported total expenditure to date of रु 38 billion for the 740 km under the directorate, not the full 1,390 km route. Historical snapshot; not comparable to the broad रु 75B whole-project estimate for an overspend test."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "North-South Koshi Corridor",
    "ministry": "Department of Roads",
    "location": "Chatara (Sunsari) â†’ Kimathanka (Sankhuwasabha, Tibet border)",
    "province": "Koshi",
    "budget": "16.2B",
    "progress": 49,
    "status": "Delayed",
    "category": "Highway",
    "description": "375 km Koshi gorge road opening Nepal-Tibet trade via Kimathanka. 4 km track still unopened; sharp bends flagged for redesign.",
    "updated": "FY 2082/83",
    "spent": "7.28B",
    "target": "FY 2085/86 (NPC estimate)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "North-South Kaligandaki Corridor",
    "ministry": "Department of Roads",
    "location": "Sunauli (Nawalparasi) â†’ Korala (Mustang, Tibet border)",
    "province": "Gandaki",
    "budget": "35B",
    "progress": 71.23,
    "status": "At risk",
    "category": "Highway",
    "description": "442 km Sunauli-Korala corridor through Kaligandaki gorge to Mustangâ€™s Tibetan frontier. The Gaindakot-Ramdi-Maldhunga stretch hit 78.5%.",
    "updated": "FY 2082/83",
    "spent": "23.5B",
    "target": "FY 2088/89 (NPC estimate)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "North-South Karnali Corridor",
    "ministry": "Department of Roads / Nepali Army",
    "location": "Jamunaha (Banke, India) â†’ Hilsa (Humla, Tibet border)",
    "province": "Karnali",
    "budget": "29B",
    "progress": 13,
    "status": "Delayed",
    "category": "Highway",
    "description": "508 km trans-Himalayan lifeline - the slowest NPP. Humla only linked by a Bailey bridge in 2024 after 15 years of cliff-blasting.",
    "updated": "FY 2082/83",
    "spent": "3.37B",
    "target": "FY 2089/90 (NPC estimate)",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/ce/Karnali_Highway_view.jpg",
    "gallery": [
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/Karnali_Highway_view.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/7/75/Maya_Devi_Temple_and_Ashoka_Pillar,_Lumbini,_Rupandehi,_Nepal.jpg"
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Nijgadh International Airport",
    "ministry": "Ministry of Culture, Tourism & Civil Aviation",
    "location": "Nijgadh, Bara (Madhesh)",
    "province": "Madhesh",
    "budget": "165B (NPC estimate)",
    "progress": 0,
    "status": "Delayed",
    "category": "Airport",
    "description": "Planned 4-runway mega-hub to relieve Tribhuvan Airport, frozen after the Supreme Court flagged its EIA inside old-growth forest.",
    "updated": "FY 2082/83",
    "spent": "610M (partial, through FY 2077/78)",
    "target": "Stalled - SC ruling",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Nijgadh_International_Airport_Concept.png",
    "changeLog": [
      {
        "date": "FY 2077/78 (2020/21)",
        "field": "Cumulative expenditure",
        "from": "Unavailable",
        "to": "रु 610M (partial, through FY 2077/78)",
        "source": "Office of the Auditor General, 58th Annual Report",
        "sourceUrl": "https://oag.gov.np/site_uploads/bg1-Some%20sections%20of%20Annual%20Report%202078%20English%20Version..pdf",
        "note": "The national pride projects table reports NPR 0.61 billion total expenditure to date. This is a historical audited snapshot, not a current cumulative total. It is below the report's NPR 165 billion estimated cost; this snapshot does not establish current budget status."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ],
    "updates": [
      {
        "date": "05 Apr 2026",
        "title": "Stalled - Supreme Court EIA ruling",
        "type": "Alert",
        "text": "SC halted clearing inside old-growth forest; no new EIA approved. Annual symbolic budget रु 1B with no physical works."
      },
      {
        "date": "18 May 2022",
        "title": "EIA struck down",
        "type": "News",
        "text": "Supreme Court questioned EIA adequacy; project frozen pending alternative site / full EIA."
      },
      {
        "date": "26 Jul 2020",
        "title": "Milestone - Detailed Master Plan completed",
        "type": "Milestone",
        "text": "4-runway master plan approved, 4.5M pax/yr phase-1."
      }
    ]
  },
  {
    "name": "West Seti Reservoir Hydropower (800 MW)",
    "ministry": "Investment Board Nepal",
    "location": "Doti-Dadeldhura, Sudurpashchim",
    "province": "Sudurpashchim",
    "budget": "200.57B",
    "budgetNote": "Indicative IBN estimate converted from USD; this is a project estimate, not a confirmed appropriation.",
    "progress": 0,
    "status": "Delayed",
    "category": "Hydropower",
    "description": "An 800 MW reservoir project under study by Investment Board Nepal, alongside the 450 MW Seti River-6 project. IBN says the survey-license period was extended in November 2025; construction has not started.",
    "updated": "Feb 2026 (IBN)",
    "spent": "340M",
    "spentNote": "IBN reported investment realized through December 2023 for West Seti and SR-6 combined; not a West Seti-only total.",
    "target": "Survey phase; no construction completion date reported",
    "source": "Investment Board Nepal - Dispatch, Feb 2026",
    "sourceUrl": "https://giwmscdntwo.gov.np/media/pdf_upload/IBN%20Dispatch%20February%202026%20%2823%29-Final-%202082-9-27_i6xphmr.pdf",
    "image": "/images/nepal-infrastructure.png",
    "changeLog": [
      {
        "date": "Dec 2023",
        "field": "Investment realized (joint project scope)",
        "from": "Unavailable",
        "to": "रु 340M (West Seti + SR-6 combined; partial)",
        "source": "Investment Board Nepal, Dispatch Nov-Dec 2023",
        "sourceUrl": "https://ibn.gov.np/uploads/documents/ibn-dispatch-vol-64pdf-9235-529-1704446910.pdf",
        "note": "IBN reports रु 0.34 billion investment realized for the combined West Seti and SR-6 projects. This is not West Seti-only expenditure, and no newer cumulative realization amount was located."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "East-West Railway (Mechi-Mahakali)",
    "ministry": "Department of Railways / MoPIT",
    "location": "Kakarbhitta (Jhapa) â†’ Gaddachauki (Kanchanpur)",
    "province": "National",
    "budget": "1,017B (NPC estimate)",
    "progress": 3.6,
    "status": "Delayed",
    "category": "Rail",
    "description": "945 km electrified spine plus Kathmandu spur - the priciest NPP on paper. Land-compensation rows and budget droughts curb progress.",
    "updated": "FY 2082/83",
    "spent": "33.73B",
    "target": "Completion year not set",
    "source": "National Planning Commission â€” National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Nagdhunga-Naubise Tunnel",
    "ministry": "Department of Roads",
    "location": "Nagdhunga Pass, Kathmandu-Dhading",
    "province": "Bagmati",
    "budget": "29B",
    "budgetNote": "Approximate completed project cost reported in August 2026; project cost reports vary by scope.",
    "progress": 68,
    "status": "On track",
    "category": "Highway",
    "description": "2.7 km twin-tube road tunnel under Nagdhunga pass - Japan-funded, set to end the Kathmandu entry bottleneck.",
    "updated": "18 Aug 2026",
    "spent": "26.9B",
    "spentNote": "Approximate May 2026 figure derived from the project director's report that 96% of about रु 28B had been spent; not a final audited total.",
    "target": "FY 2026/27",
    "source": "Department of Roads project director, reported by Khabarhub / Kathmandu Post",
    "sourceUrl": "https://english.khabarhub.com/2026/06/547379/",
    "image": "/images/nepal-infrastructure.png",
    "changeLog": [
      {
        "date": "May 2026 (reported); completed-cost update Aug 2026",
        "field": "Cumulative expenditure (approximate, derived)",
        "from": "Unavailable",
        "to": "रु 26.9B approx. (96% of approx. रु 28B public investment)",
        "source": "Nagdhunga Tunnel Project Director, reported by Khabarhub; completion cost reported by Kathmandu Post",
        "sourceUrl": "https://english.khabarhub.com/2026/06/547379/",
        "note": "The project director said about 96% of the budget had been spent and described the public investment as around रु 28B; रु 26.9B is a calculation from those rounded figures, not an audited exact total. Kathmandu Post later reported the completed project cost at around रु 29B. Treat this as a partial historical estimate, not final expenditure."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "MCC Nepal Compact â€” Electricity Transmission Project",
    "ministry": "Millennium Challenge Account Nepal / Ministry of Finance",
    "location": "National transmission network (cross-border connections)",
    "province": "National",
    "budget": "113.51B (NPC estimate, FX converted)",
    "progress": 18.24,
    "status": "Delayed",
    "category": "Power",
    "description": "Compact-funded transmission lines and substations intended to strengthen Nepalâ€™s electricity grid and cross-border power trade. NPC reports cumulative physical progress through FY 2082/83.",
    "updated": "FY 2082/83",
    "spent": "2.77B (NPC report units, FX converted)",
    "target": "FY 2085/86 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Kathmandu Valley Wholesale Water Supply Transmission (Phase 2)",
    "ministry": "Ministry of Water Supply",
    "location": "Kathmandu Valley",
    "province": "Bagmati",
    "budget": "38.43B (NPC estimate)",
    "progress": 5.35,
    "status": "Delayed",
    "category": "Water",
    "description": "A separate national-pride transmission project listed alongside Melamchi in the NPC portfolio. The FY 2082/83 report records 5.35% cumulative physical progress.",
    "updated": "FY 2082/83",
    "spent": "1.91B",
    "target": "FY 2085/86 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Melamchi Water Supply (Phase 1)",
    "ministry": "Ministry of Water Supply",
    "location": "Melamchi â†’ Sundarijal, Kathmandu Valley",
    "province": "Bagmati",
    "budget": "37.69B",
    "progress": 99.47,
    "status": "On track",
    "category": "Water",
    "description": "26.5 km tunnel diverting Melamchi River water to Kathmandu - Phase 1 finally delivering after the 2021 flood washout.",
    "updated": "FY 2082/83",
    "spent": "31.15B",
    "target": "FY 2086/87 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/60/Melamchi_Project_Camp.JPG",
    "gallery": [
      "https://upload.wikimedia.org/wikipedia/commons/6/60/Melamchi_Project_Camp.JPG",
      "https://upload.wikimedia.org/wikipedia/commons/d/db/Gautam_Buddha_International_Airport.jpg"
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ],
    "updates": [
      {
        "date": "15 Feb 2026",
        "title": "Phase 1 marked completed - water flowing",
        "type": "Milestone",
        "text": "Melamchi Board: 26.5 km tunnel under test, bulk water reaching Sundarijal treatment plant after 2021 flood repair."
      },
      {
        "date": "18 Aug 2025",
        "title": "Headworks reconstruction finished",
        "type": "Update",
        "text": "Flood-damaged headworks rebuilt; river diversion restored to 170 MLD capacity."
      },
      {
        "date": "14 Jul 2021",
        "title": "Alert - 2021 flood washout",
        "type": "Alert",
        "text": "Melamchi flood destroyed supply tunnel intake; project stalled 2 years, cost overrun रु 2.1B."
      }
    ]
  },
  {
    "name": "Gautam Buddha International Airport",
    "ministry": "Ministry of Culture, Tourism & Civil Aviation",
    "location": "Siddharthanagar, Rupandehi (Lumbini)",
    "province": "Lumbini",
    "budget": "6.82B",
    "progress": 100,
    "status": "Completed",
    "category": "Airport",
    "description": "Nepalâ€™s second international gateway at Siddharthanagar, built for Buddhist pilgrimage traffic to Lumbini.",
    "updated": "FY 2082/83",
    "spent": "6.82B",
    "target": "Operational",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/d/db/Gautam_Buddha_International_Airport.jpg",
    "completionNote": "Ten years in the making. Started 2009 under the ADB South Asia Tourism Infrastructure Project; Chinese contractor awarded Oct 2014 with a 2017 completion target that slipped repeatedly. Final result: a 3,000 m runway handling the largest commercial jets and a 15,169 mÂ² terminal for ~1M passengers/year. Opened 16 May 2022 - but the expected international carriers never materialised, and it still serves few regular international routes.",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Done",
        "date": "2024",
        "note": "Completion reported by project entity."
      },
      {
        "label": "Handover & operations",
        "state": "Done",
        "date": "2024",
        "note": "Operational status reported."
      }
    ]
  },
  {
    "name": "Pokhara International Airport",
    "ministry": "Ministry of Culture, Tourism & Civil Aviation",
    "location": "Chhinedanda, Pokhara (Gandaki)",
    "province": "Gandaki",
    "budget": "22B",
    "progress": 100,
    "status": "Completed",
    "category": "Airport",
    "description": "Gateway at Chhinedanda for Annapurna tourism, plagued by Rithepani hill cut and low international demand.",
    "updated": "FY 2082/83",
    "spent": "21.76B",
    "target": "Operational",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/en/4/4d/Pokhara_Intl_Airport_Terminal_Tower_Parking.jpg",
    "completionNote": "Built by China CAMC Engineering under a 2013 agreement; financed by a रु 32.67B China EXIM concessional loan (~25% interest-free, rest at ~2% over 20 years), plus रु 5.62B from ADB and रु 1.67B from OPEC Fund. Delays came from the Rithepani hill flattening dispute and COVID-19. Inaugurated 1 Jan 2023 - but as of 2026 it handles mostly domestic traffic with no scheduled international services, and the NYT has flagged construction-cost concerns and debt-sustainability risks.",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Done",
        "date": "2024",
        "note": "Completion reported by project entity."
      },
      {
        "label": "Handover & operations",
        "state": "Done",
        "date": "2024",
        "note": "Operational status reported."
      }
    ]
  },
  {
    "name": "Upper Tamakoshi Hydropower (456 MW)",
    "ministry": "Nepal Electricity Authority",
    "location": "Gaurishankar, Dolakha (Tamakoshi River)",
    "province": "Bagmati",
    "budget": "49B",
    "progress": 100,
    "status": "Completed",
    "category": "Hydropower",
    "description": "Largest run-of-the-river plant in Nepal (456 MW, 2,281 GWh/yr) sited in Gaurishankar Conservation Area near the Tibet border.",
    "updated": "FY 2082/83",
    "spent": "49B",
    "target": "Operational",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/28/Upper_Tamakoshi_Access_Tunnel.jpg",
    "completionNote": "Nepal's largest run-of-river power plant, financed by NEA, EPF, CIT, Nepal Telecom, RBB and NBL. Began in 2011 after an earlier target; the 2015 earthquakes damaged the access road and later delays pushed completion to 2021. The NPC portfolio lists a revised project cost of रु 49B; this tracker uses that official project-cost figure. First unit synchronised 5 Jul 2021. Contractors: Sinohydro (civil), Andritz (electro-mechanical), KEC International (transmission).",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Done",
        "date": "2024",
        "note": "Completion reported by project entity."
      },
      {
        "label": "Handover & operations",
        "state": "Done",
        "date": "2024",
        "note": "Operational status reported."
      }
    ]
  },
  {
    "name": "Siddhababa Tunnel (1,126 m)",
    "ministry": "Department of Roads",
    "location": "Dobhan, Palpa (Siddhartha Highway)",
    "province": "Lumbini",
    "budget": "7.34B",
    "budgetNote": "Reported EPC contract amount.",
    "progress": 65,
    "status": "On track",
    "category": "Highway",
    "description": "1,126 m Himalayan bypass on Siddhartha Highway - EPC by China State Construction (CSCEC) to end landslide closures at Siddhababa.",
    "updated": "22 Dec 2025",
    "spent": "3B",
    "spentNote": "Approximate amount reported by the Project Office through the January 2025 tunnel breakthrough; newer reports do not publish a cumulative NPR total.",
    "target": "Apr 2027 (contract)",
    "source": "Siddhababa Tunnel Project Office, reported by Republica",
    "sourceUrl": "https://myrepublica.nagariknetwork.com/index.php/news/breakthrough-achieved-in-siddhababa-tunnel-679381ecd758d.html",
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Siddha_baba_Temple.jpg",
    "changeLog": [
      {
        "date": "Jan 2025",
        "field": "Cumulative construction expenditure (approximate)",
        "from": "Unavailable",
        "to": "रु 3B approx. (partial; through tunnel breakthrough)",
        "source": "Siddhababa Tunnel Project Office, reported by Republica",
        "sourceUrl": "https://myrepublica.nagariknetwork.com/index.php/news/breakthrough-achieved-in-siddhababa-tunnel-679381ecd758d.html",
        "note": "The Project Office reported approximately रु 3 billion spent at the January 2025 breakthrough. Later reports give financial progress percentages, including 63.55% in September 2026, but no newer cumulative NPR amount; this is therefore a dated partial amount, not the current total."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Lumbini Area Development",
    "ministry": "Ministry of Culture, Tourism & Civil Aviation",
    "location": "Lumbini, Rupandehi (UNESCO World Heritage)",
    "province": "Lumbini",
    "budget": "13.26B",
    "progress": 90.5,
    "status": "On track",
    "category": "Heritage",
    "description": "Master-plan upgrading of the Buddha birthplace - monasteries, museum, sacred garden and pilgrimage circuit.",
    "updated": "FY 2082/83",
    "spent": "9.16B",
    "target": "FY 2083 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/75/Maya_Devi_Temple_and_Ashoka_Pillar,_Lumbini,_Rupandehi,_Nepal.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Pashupati Area Development",
    "ministry": "Ministry of Culture, Tourism & Civil Aviation",
    "location": "Pashupatinath, Kathmandu (UNESCO World Heritage)",
    "province": "Bagmati",
    "budget": "2.27B",
    "progress": 98.33,
    "status": "At risk",
    "category": "Heritage",
    "description": "264 ha sacred precinct around Pashupatinath Temple plus Gothatar annex - 518 structures, 70% needing post-quake reconstruction.",
    "updated": "FY 2082/83",
    "spent": "870M (partial, through FY 2077/78)",
    "target": "Continuous (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c6/Nepal_-_Kathmandu_-_015_-_Pashupatinath_Temple.jpg",
    "changeLog": [
      {
        "date": "FY 2077/78 (2020/21)",
        "field": "Cumulative expenditure",
        "from": "Unavailable",
        "to": "रु 870M (partial, through FY 2077/78)",
        "source": "Office of the Auditor General, 58th Annual Report",
        "sourceUrl": "https://oag.gov.np/site_uploads/bg1-Some%20sections%20of%20Annual%20Report%202078%20English%20Version..pdf",
        "note": "The national pride projects table reports NPR 0.87 billion total expenditure to date. This is a historical audited snapshot, not a current cumulative total. It is below the report's NPR 2.01 billion estimated cost; this snapshot does not establish current budget status."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Sikta Irrigation Project",
    "ministry": "Department of Irrigation",
    "location": "Banke, Lumbini - Rapti River",
    "province": "Lumbini",
    "budget": "52.89B",
    "progress": 51,
    "status": "Delayed",
    "category": "Irrigation",
    "description": "42,700 ha command in Banke, Western Terai - canal breached by dispersive soil in 2016, now half-built after 21 years.",
    "updated": "FY 2082/83",
    "spent": "24.33B",
    "target": "FY 2089/90 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Sikta_Irrigation_Canal_during_construction_2013.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Bheri Babai Diversion Multipurpose Project",
    "ministry": "Ministry of Energy, Water Resources & Irrigation",
    "location": "Surkhet-Bardiya (Bheri â†’ Babai tunnel)",
    "province": "Karnali",
    "budget": "33.2B",
    "progress": 67,
    "status": "At risk",
    "category": "Irrigation",
    "description": "12 km tunnel feeding Bheri water into Babai to irrigate Banke/Bardiya and generate 48 MW - ordered finished within 2 years.",
    "updated": "FY 2082/83",
    "spent": "19.3B",
    "target": "FY 2087/88 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://www.robbinstbm.com/wp-content/uploads/2021/01/himcase4.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Babai Irrigation Project",
    "ministry": "Department of Irrigation",
    "location": "Bardiya, Lumbini - Babai River",
    "province": "Lumbini",
    "budget": "26.69B",
    "progress": 81.97,
    "status": "On track",
    "category": "Irrigation",
    "description": "36,000 ha year-round irrigation in Bardiya - Nepalâ€™s oldest pride project (since 1988), now 28,800 ha irrigated.",
    "updated": "FY 2082/83",
    "spent": "18.21B",
    "target": "FY 2085/86 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Rani Jamara Kulariya Irrigation Project",
    "ministry": "Department of Irrigation",
    "location": "Kailali, Sudurpashchim (Karnali basin)",
    "province": "Sudurpashchim",
    "budget": "28.78B",
    "progress": 74.8,
    "status": "At risk",
    "category": "Irrigation",
    "description": "Modernisation of Nepalâ€™s oldest farmer-built canal to feed 12,400 ha remaining in the far-west Terai.",
    "updated": "FY 2082/83",
    "spent": "21.33B",
    "target": "FY 2087/88 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Done",
        "date": "2024",
        "note": "No open issue found in latest indexed update."
      },
      {
        "label": "Construction",
        "state": "Active",
        "date": "Latest update",
        "note": "Physical progress is based on the latest published progress report."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Sunkoshi Marin Diversion Multipurpose Project",
    "ministry": "Ministry of Energy, Water Resources & Irrigation",
    "location": "Sindhuli â†’ Sarlahi (Sunkoshi â†’ Marin)",
    "province": "Bagmati",
    "budget": "61.65B",
    "progress": 37.81,
    "status": "Delayed",
    "category": "Irrigation",
    "description": "66 km tunnel diverting Sunkoshi to Marin to irrigate 122,000 ha in Dhanusha-Sarlahi - रु 24B tender re-bidding.",
    "updated": "FY 2082/83",
    "spent": "16.81B",
    "target": "FY 2089/90 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://assets-cdn.kathmandupost.com/uploads/source/news/2024/news/thumb16-1715154116.jpg",
    "gallery": [
      "https://cdn.corporatekhabar.com/uploads/2025/11/Sunkoshi-Marin-Diversion-Project-4-scaled-1.webp",
      "https://shilapatra.com/uploads/posts/2-1748050154.JPG"
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Mahakali Irrigation Project",
    "ministry": "Department of Irrigation",
    "location": "Kanchanpur, Sudurpashchim (Mahakali River)",
    "province": "Sudurpashchim",
    "budget": "35.03B",
    "progress": 31,
    "status": "Delayed",
    "category": "Irrigation",
    "description": "33,520 ha Kanchanpur scheme on the Mahakali - 19 years, only a quarter complete, farmers still rain-fed.",
    "updated": "FY 2082/83",
    "spent": "10.72B",
    "target": "FY 2087/88 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://commons.wikimedia.org/wiki/Special:FilePath/MahaKaliCanal.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "President Chure-Terai Madhesh Conservation Area",
    "ministry": "Ministry of Forests and Environment",
    "location": "Chure-Siwalik range (national)",
    "province": "National",
    "budget": "249.7B",
    "progress": 6.7,
    "status": "Delayed",
    "category": "Conservation",
    "description": "Country-length Chure hills ecosystem shield - afforestation, bio-engineering and watershed protection.",
    "updated": "FY 2082/83",
    "spent": "16.43B",
    "target": "FY 2093/94 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Gautam Buddha International Cricket Stadium",
    "ministry": "Ministry of Youth and Sports / Bharatpur Metro",
    "location": "Bharatpur, Chitwan (Bagmati)",
    "province": "Bagmati",
    "budget": "785M",
    "progress": 30,
    "status": "At risk",
    "category": "Sports",
    "description": "15,000-seat stadium for Nepalâ€™s national team - from the Dhurmus Suntali rescue to a federal-province-city joint venture.",
    "updated": "11 Aug 2025",
    "spent": "540M",
    "target": "06 Jan 2027",
    "source": "Bharatpur Metro / Republica",
    "sourceUrl": "https://bharatpurmun.gov.np/",
    "image": "/images/nepal-infrastructure.png",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Mulpani Cricket Stadium",
    "ministry": "Ministry of Youth and Sports",
    "location": "Mulpani, Kathmandu",
    "province": "Bagmati",
    "budget": "7.49B",
    "progress": 7,
    "status": "Delayed",
    "category": "Sports",
    "description": "National-pride cricket facility at Mulpani. NPC reported 7% cumulative physical progress and रु 192.3M spent through FY 2082/83; its completion estimate is FY 2084/85.",
    "updated": "FY 2082/83",
    "spent": "192.3M",
    "target": "FY 2084/85 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c1/Mulpani_cricket_ground.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Girija Prasad Koirala Cricket Stadium",
    "ministry": "Ministry of Youth and Sports",
    "location": "Baijnathpur, Morang (Koshi)",
    "province": "Koshi",
    "budget": "3.65B",
    "budgetNote": "National Planning Commission estimated total project cost.",
    "progress": 0.1,
    "status": "Delayed",
    "category": "Sports",
    "description": "Biratnagar cricket stadium. NPC reports 0.1% cumulative physical progress through FY 2082/83 and estimates completion in FY 2084/85, subject to tendering.",
    "updated": "FY 2082/83",
    "spent": "2.1M",
    "spentNote": "FY 2082/83 expenditure only; cumulative spending has not been reported.",
    "target": "FY 2084/85 (NPC estimate)",
    "source": "National Planning Commission - National Pride progress, FY 2082/83",
    "sourceUrl": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/",
    "image": "/images/nepal-infrastructure.png",
    "changeLog": [
      {
        "date": "FY 2082/83 (2025/26)",
        "field": "Expenditure for fiscal year (not cumulative)",
        "from": "Unavailable",
        "to": "रु 2.1M for FY 2082/83; cumulative total unavailable",
        "source": "Ministry of Youth and Sports annual report, reported by Bizmandu",
        "sourceUrl": "https://bizmandu.com/content/20261004194153.html",
        "note": "The report says रु 21 lakh was spent against the रु 160 million FY allocation; the tender was not invited because the budget was frozen and multi-year approval was unavailable. This is one-year spending, not lifetime cumulative expenditure."
      }
    ],
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  },
  {
    "name": "Tribhuvan University Cricket Ground",
    "ministry": "Ministry of Youth and Sports",
    "location": "Kirtipur, Kathmandu",
    "province": "Bagmati",
    "budget": "420M (allocated)",
    "progress": 25,
    "status": "At risk",
    "category": "Sports",
    "description": "TU Ground being upgraded with floodlights and drainage for ODI status while Mulpani is stalled.",
    "updated": "29 May 2025",
    "spent": "Unavailable",
    "target": "Not reported",
    "source": "Khabarhub / Budget FY 2082/83",
    "sourceUrl": "https://moys.gov.np/",
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/32/Kirtipur_cricket_ground.jpg",
    "checklist": [
      {
        "label": "Feasibility & design",
        "state": "Done",
        "date": "2021",
        "note": "Design package recorded in project documentation."
      },
      {
        "label": "Procurement / tender",
        "state": "Done",
        "date": "2022",
        "note": "Contract notice and award should be verified against PPMO records."
      },
      {
        "label": "Contract signed",
        "state": "Done",
        "date": "2022",
        "note": "Primary contract is recorded by the responsible agency."
      },
      {
        "label": "Land & environment",
        "state": "Active",
        "date": "2026",
        "note": "Current clearance status needs a newer official update."
      },
      {
        "label": "Construction",
        "state": "Blocked",
        "date": "Latest update",
        "note": "Schedule or implementation issue flagged in the latest public record."
      },
      {
        "label": "Testing & commissioning",
        "state": "Unknown",
        "date": "Not reported",
        "note": "No usable public milestone date found."
      },
      {
        "label": "Handover & operations",
        "state": "Unknown",
        "date": "Not reported",
        "note": "Not yet evidenced in indexed sources."
      }
    ]
  }
]

export function findCompanyBySlug(slug: string): Company | undefined {
  return companies.find(c => slugify(c.name) === slug)
}

export function parseBudgetCr(budget: string): number | null {
  if (!budget || budget === 'Unavailable') return null
  if (/\+|prior|ongoing|partial|at least/i.test(budget)) return null
  // Project amounts are normalized to NPR and may use B, M, or T units.
  const m = budget.match(/([\d,.]+)\s*(B|M|T)/i)
  if (!m) return null
  const val = parseFloat(m[1].replace(/,/g, ''))
  const unit = m[2].toUpperCase()
  // Cr = 10M NPR. So B = 100 Cr, M = 0.1 Cr, T = 100000 Cr
  if (unit === 'B') return Math.round(val * 100)
  if (unit === 'M') return Math.round(val * 0.1 * 10) / 10 // keep 1 decimal for small
  if (unit === 'T') return Math.round(val * 100000)
  return null
}

export function utilizationPct(spent: string, budget: string): number | null {
  const s = parseBudgetCr(spent)
  const b = parseBudgetCr(budget)
  if (s == null || b == null || b === 0) return null
  return Math.round((s / b) * 100)
}

export const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'] as const

export function provinceFromLocation(loc: string): string | null {
  const hay = loc.toLowerCase()
  if (hay.includes('koshi')) return 'Koshi'
  if (hay.includes('madhesh') || hay.includes('bara') || hay.includes('sarlahi') || hay.includes('dhanusha')) return 'Madhesh'
  if (hay.includes('bagmati') || hay.includes('kathmandu') || hay.includes('lalitpur') || hay.includes('dhading') || hay.includes('dolakha') || hay.includes('palpa') || hay.includes('chitwan') || hay.includes('sindhuli')) return 'Bagmati'
  if (hay.includes('gandaki') || hay.includes('pokhara') || hay.includes('mustang') || hay.includes('kaski') || hay.includes('nawalparasi')) return 'Gandaki'
  if (hay.includes('lumbini') || hay.includes('rupandehi') || hay.includes('banke') || hay.includes('bardiya') || hay.includes('surkhet')) return 'Lumbini'
  if (hay.includes('karnali') || hay.includes('humla')) return 'Karnali'
  if (hay.includes('sudurpashchim') || hay.includes('doti') || hay.includes('kailali') || hay.includes('kanchanpur') || hay.includes('dadeldhura')) return 'Sudurpashchim'
  if (hay.includes('national') || hay.includes('jhap') || hay.includes('kanchanpur')) return null
  return null
}

export function findProjectBySlug(slug: string): Project | undefined {
  return projects.find(p => slugify(p.name) === slug)
}

export const sources: Source[] = [
  {
    "title": "IBN Dispatch - West Seti survey license extension",
    "publisher": "Investment Board Nepal",
    "date": "Feb 2026",
    "type": "Official project update",
    "verified": true,
    "url": "https://giwmscdntwo.gov.np/media/pdf_upload/IBN%20Dispatch%20February%202026%20%2823%29-Final-%202082-9-27_i6xphmr.pdf"
  },
  {
    "title": "National Pride Projects - cumulative progress through FY 2082/83",
    "publisher": "National Planning Commission",
    "date": "Sep 2026",
    "type": "Official progress report",
    "verified": true,
    "url": "https://npc.gov.np/content/6836/overall-progress-statement-of-the-project-of/"
  },
  {
    "title": "World Bank Open Data - Nepal",
    "publisher": "World Bank",
    "date": "Updated Jul 2026",
    "type": "API (live)",
    "verified": true,
    "url": "https://data.worldbank.org/country/nepal"
  },
  {
    "title": "Economic Survey FY 2025/26",
    "publisher": "Ministry of Finance",
    "date": "May 2026",
    "type": "Official report",
    "verified": true,
    "url": "https://mof.gov.np/"
  },
  {
    "title": "Half-yearly budget review FY 2025/26",
    "publisher": "Ministry of Finance",
    "date": "Feb 2026",
    "type": "Progress review",
    "verified": true,
    "url": "https://mof.gov.np/"
  },
  {
    "title": "62nd Annual Report - pride projects audit",
    "publisher": "Office of the Auditor General",
    "date": "May 2025",
    "type": "Audit report",
    "verified": true,
    "url": "https://oag.gov.np/"
  },
  {
    "title": "Katmandu Journal - NPP endless list",
    "publisher": "Katmandu Journal",
    "date": "14 Jul 2026",
    "type": "Investigative",
    "verified": true,
    "url": "https://katmandujournal.com/2026/07/14/the-national-planning-commissions-endless-project-list/"
  },
  {
    "title": "Consolidated Financial Statement",
    "publisher": "Financial Comptroller General Office",
    "date": "FY 2023/24",
    "type": "Government accounts",
    "verified": true,
    "url": "https://fcgo.gov.np/"
  },
  {
    "title": "e-GP procurement notices & awards",
    "publisher": "PPMO",
    "date": "Indexed daily",
    "type": "Procurement record",
    "verified": true,
    "url": "https://bolpatra.gov.np/"
  },
  {
    "title": "Annual Progress Review 2081/82",
    "publisher": "National Planning Commission",
    "date": "Jul 2025",
    "type": "Progress update",
    "verified": true,
    "url": "https://npc.gov.np/"
  },
  {
    "title": "Quarterly macroeconomic report",
    "publisher": "Nepal Rastra Bank",
    "date": "Q4 FY 2024/25",
    "type": "Quarterly report",
    "verified": true,
    "url": "https://www.nrb.org.np/"
  },
  {
    "title": "Annual Status Review of PEs FY 2024/25",
    "publisher": "Ministry of Finance",
    "date": "May 2026",
    "type": "PE review",
    "verified": true,
    "url": "https://mof.gov.np/"
  },
  {
    "title": "NRB Foreign Exchange Rates API",
    "publisher": "Nepal Rastra Bank",
    "date": "Daily (live)",
    "type": "API (live)",
    "verified": true,
    "url": "https://www.nrb.org.np/api-docs-v1/"
  },
  {
    "title": "DataNepal - open data for Nepal",
    "publisher": "DataNepal (NSO / ECN / WDI mirrors)",
    "date": "Updated Aug 2026",
    "type": "API (live)",
    "verified": true,
    "url": "https://datanepal.org/datasets/"
  },
  {
    "title": "National Population and Housing Census 2021",
    "publisher": "National Statistics Office",
    "date": "2021 (decennial)",
    "type": "Official statistics",
    "verified": true,
    "url": "https://censusresults.nsonepal.gov.np/"
  },
  {
    "title": "PPMO e-GP tenders - OCDS open archive",
    "publisher": "Open Contracting Partnership / PPMO",
    "date": "2016-2018 (mirror)",
    "type": "API (live)",
    "verified": true,
    "url": "https://data.open-contracting.org/en/publication/36"
  },
  {
    "title": "Hydropower Portal API - districts & plants",
    "publisher": "Naxa / Niti Foundation",
    "date": "Live (daily)",
    "type": "API (live)",
    "verified": true,
    "url": "https://hydro.naxa.com.np"
  },
  {
    "title": "BIPAD Disaster-Risk API",
    "publisher": "NDRRMA",
    "date": "Live (incidents, alerts, telemetry)",
    "type": "API (live)",
    "verified": true,
    "url": "https://bipadportal.gov.np/"
  },
  {
    "title": "DHM Weather Forecast API",
    "publisher": "Dept. of Hydrology and Meteorology",
    "date": "Twice daily (live)",
    "type": "API (live)",
    "verified": true,
    "url": "https://dhm.gov.np/"
  },
  {
    "title": "World Bank Projects API - Nepal",
    "publisher": "World Bank",
    "date": "Daily (live)",
    "type": "API (live)",
    "verified": true,
    "url": "https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact=NP"
  },
  {
    "title": "WHO Global Health Observatory",
    "publisher": "World Health Organization",
    "date": "Annual (live API)",
    "type": "API (live)",
    "verified": true,
    "url": "https://www.who.int/data/gho"
  },
  {
    "title": "HDX - Nepal COD boundaries & population",
    "publisher": "OCHA / UNFPA via HDX",
    "date": "Annual (live API)",
    "type": "API (live)",
    "verified": true,
    "url": "https://data.humdata.org/group/npl"
  },
  {
    "title": "UNICEF Data - Nepal",
    "publisher": "UNICEF",
    "date": "Annual (SDMX API)",
    "type": "API (live)",
    "verified": true,
    "url": "https://data.unicef.org/"
  },
  {
    "title": "USGS Earthquakes - Nepal bbox",
    "publisher": "USGS",
    "date": "Real-time (live)",
    "type": "API (live)",
    "verified": true,
    "url": "https://earthquake.usgs.gov/"
  },
  {
    "title": "Open-Meteo - district weather & AQI",
    "publisher": "Open-Meteo",
    "date": "Hourly (live)",
    "type": "API (live)",
    "verified": true,
    "url": "https://open-meteo.com/"
  }
]

export const prompt = `Build a production Python 3.12 data-ingestion service for a Nepal public accountability dashboard. Create source adapters for MoF (mof.gov.np), FCGO (fcgo.gov.np), PPMO/e-GP (bolpatra.gov.np), NPC, Department of Roads, NRB, Melamchi, NEA, Nepal Telecom, and public-enterprise report pages. Use httpx + BeautifulSoup first, Playwright only when necessary, and pdfplumber/pymupdf with OCR fallback for scanned PDFs. Run daily with APScheduler or cron. Store raw documents with URL, SHA-256 checksum, accessed_at, publication_period, parser_version, and extraction_confidence. Detect changes by checksum, normalize companies, quarterly reports, projects, milestones, budgets, spending, progress, and source records into Postgres tables. Respect robots.txt, rate limits, caching, retries, and a clear User-Agent. Never overwrite history: use idempotent upserts and immutable snapshots. Validate numeric units, fiscal years, NPR currency, duplicate documents, impossible progress values, and conflicting reports. Queue low-confidence/OCR/conflicting records for manual review before publishing. Expose /api/entities, /api/companies/:id/quarters, /api/projects/:id/checklist, /api/sources, and /api/health. Add pytest adapter fixtures, structured JSON logs, fetch failure alerts, parser metrics, and a review UI. Publish only records with provenance and confidence labels; return unavailable instead of guessing.`
