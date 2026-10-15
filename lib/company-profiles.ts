import type { CompanyProfile } from './types'

export const companyProfiles: Record<string, CompanyProfile> = {
  "Employees Provident Fund (Karmachari Sanchaya Kosh)": {
    "earnsFrom": "Invests long-term member savings and earns investment returns; it also administers provident-fund and contributory-pension schemes.",
    "earningsCaveat": "Member contributions are retirement savings held for members, not ordinary company sales revenue. No comparable company profit figure is entered in this tracker.",
    "ownershipContext": "Autonomous statutory institution established under the Employees Provident Fund Act, 2019. Its relationship with the Government of Nepal is through the Ministry of Finance. It is not a shareholding company, and government ownership percentage is not applicable; fund assets include member contributions.",
    "ministry": "Ministry of Finance",
    "ministryUrl": "https://mof.gov.np",
    "websiteUrl": "https://epf.org.np",
    "nepseContext": "EPF holds a reported 10% stake in Nepal Stock Exchange itself. That makes EPF an owner of the exchange, not an actively traded NEPSE issuer. A separate EPF directory entry shows zero listed shares and zero paid-up value; the active NEPSE quote and company-financial feeds used here contain no EPF security or filings.",
    "nepseUrl": "https://www.nepalstock.com/about-us/introduction",
    "nepseDirectoryUrl": "https://www.sharesansar.com/company/EPF"
  },
  "Health Insurance Board (HIB)": {
    "earnsFrom": "Administers the public health-insurance programme, pooling member premiums and government grants to pay for covered health services.",
    "earningsCaveat": "Premiums and grants belong to the health-insurance programme; they are not commercial sales revenue or company profit. Its public reports should be read as fund inflows, claims and expenses.",
    "ownershipContext": "Autonomous statutory board under the Health Insurance Act, 2074. It administers a public insurance fund and has no company shareholders or government equity percentage.",
    "ministry": "Ministry of Health and Population",
    "ministryUrl": "https://mohp.gov.np",
    "websiteUrl": "https://hib.gov.np/"
  },
  "Social Security Fund (SSF)": {
    "earnsFrom": "Collects employer and worker contributions, manages the fund’s investments, and administers contributory social-security benefit schemes.",
    "earningsCaveat": "Contributions are held to finance contributor benefits, not ordinary company sales. Fund inflows, investments, benefit payments, operating expenses and assets are more meaningful than company profit.",
    "ownershipContext": "Statutory public fund established under the Social Security Fund (Management and Operation) Rules and governed by the Contribution-Based Social Security Act, 2074. Contributors and public institutions oversee the fund; it is not a shareholding company.",
    "ministry": "Social-security ministry represented on the governing board",
    "websiteUrl": "https://ssf.gov.np/"
  },
  "Nepal Stock Exchange (NEPSE)": {
    "earnsFrom": "Earns exchange and listing fees, transaction-related charges, and fees for market services.",
    "earningsCaveat": "FY 2081/82 total income and after-tax net profit are from the NEPSE Restructuring Report 2082. Total income includes operating and investment income.",
    "ownershipContext": "Government-majority-owned public limited company. The NEPSE Restructuring Report 2082 lists Government of Nepal 58.66%, Rastriya Banijya Bank 11.23%, Employees Provident Fund 10%, Nepal Rastra Bank 9.50%, Prabhu Bank 5%, Laxmi Sunrise Bank 5%, and other shareholders 0.61%.",
    "ownershipSlices": [
      { "label": "Government of Nepal", "percent": 58.66, "kind": "government" },
      { "label": "Rastriya Banijya Bank", "percent": 11.23, "kind": "public" },
      { "label": "Employees Provident Fund", "percent": 10, "kind": "public" },
      { "label": "Nepal Rastra Bank", "percent": 9.5, "kind": "public" },
      { "label": "Prabhu Bank", "percent": 5, "kind": "other" },
      { "label": "Laxmi Sunrise Bank", "percent": 5, "kind": "other" },
      { "label": "Other shareholders", "percent": 0.61, "kind": "other" }
    ],
    "ministry": "Ministry of Finance",
    "ministryUrl": "https://mof.gov.np",
    "websiteUrl": "https://www.nepalstock.com/about-us/introduction"
  },
  "CDS and Clearing Limited (CDSC)": {
    "earnsFrom": "Provides central depository, clearing and settlement services, including demat-account and related service fees. Mero Share is one of its investor services.",
    "earningsCaveat": "FY 2081/82 total income and net profit are from CDSC's 15th Annual Report. NPR 18.19B of transaction taxes collected for the Government is excluded from company income.",
    "ownershipContext": "Jointly owned by the Government of Nepal (49.07%) and Nepal Stock Exchange (50.93%), according to CDSC's current official profile.",
    "ownershipSlices": [
      { "label": "Government of Nepal", "percent": 49.07, "kind": "government" },
      { "label": "Nepal Stock Exchange", "percent": 50.93, "kind": "public" }
    ],
    "ministry": "Ministry of Finance (government shareholder; sector oversight by SEBON)",
    "ministryUrl": "https://mof.gov.np",
    "websiteUrl": "https://cdsc.com.np/"
  },
  "Securities Board of Nepal (SEBON)": {
    "earnsFrom": "Funded through government grants, transaction fees from the stock exchange, securities registration fees and other regulatory fees.",
    "earningsCaveat": "SEBON is a statutory regulator, not a commercial company. Company-style revenue and net-profit comparisons do not apply.",
    "ownershipContext": "Autonomous public regulator established by the Government of Nepal under securities legislation. It is governed by a board that includes government-appointed members and representatives from public institutions; it is not a shareholding company.",
    "ministry": "Ministry of Finance (board representation)",
    "ministryUrl": "https://mof.gov.np",
    "websiteUrl": "https://www.sebon.gov.np/about-sebon"
  },
  "Nepal Electricity Authority": {
    "earnsFrom": "Sells electricity to households, businesses and industry; also earns from power exports, grid services and other utility charges.",
    "ownershipContext": "State utility; fully owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Energy, Water Resources and Irrigation",
    "ministryUrl": "https://moewri.gov.np",
    "websiteUrl": "https://nea.org.np"
  },
  "Nepal Telecom": {
    "earnsFrom": "Mobile voice and data, fixed broadband, leased lines, interconnection and other telecommunications services.",
    "ownershipContext": "Listed public company with a 91.49% Government of Nepal stake; remaining shares are held by the public.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 91.49,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 8.51,
        "kind": "other"
      }
    ],
    "ministry": "Ministry of Communication and Information Technology",
    "ministryUrl": "https://mocit.gov.np",
    "websiteUrl": "https://ntc.net.np"
  },
  "Citizen Investment Trust": {
    "earnsFrom": "Earns investment returns on retirement and savings funds, plus administration and service fees from its schemes.",
    "ownershipContext": "Publicly listed institution with government and public-sector participation. The current attached source does not provide a verified full shareholder split.",
    "earningsCaveat": "Investment returns and contributions are different from ordinary product sales.",
    "websiteUrl": "https://cit.org.np"
  },
  "Rastriya Banijya Bank": {
    "earnsFrom": "Primarily net interest from deposits and lending, plus fees, commissions and treasury investments.",
    "ownershipContext": "Wholly state-owned commercial bank.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Banking operating income is not directly comparable with product sales at industrial companies.",
    "websiteUrl": "https://rbb.com.np"
  },
  "Nepal Oil Corporation": {
    "earnsFrom": "Imports and sells petroleum products and LPG through its distribution network; results depend heavily on purchase costs, regulated prices and inventory.",
    "ownershipContext": "Government of Nepal owns 99.46%; the remaining 0.54% is held by four other state-owned enterprises.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 99.46,
        "kind": "government"
      },
      {
        "label": "Other state-owned enterprises",
        "percent": 0.54,
        "kind": "public"
      }
    ],
    "earningsCaveat": "Large turnover is mostly the cost of petroleum products passing through the corporation, not profit.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np",
    "websiteUrl": "https://noc.org.np"
  },
  "Salt Trading Corporation": {
    "earnsFrom": "Trades salt, food staples, chemicals and other essential commodities, earning distribution and trading margins.",
    "ownershipContext": "Public-private company; the Government of Nepal holds about 11.5%, so it is listed here as a government-involved company, not a government-majority company.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 11.5,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 88.5,
        "kind": "other"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np",
    "websiteUrl": "https://stcnepal.com"
  },
  "Deposit and Credit Guarantee Fund": {
    "earnsFrom": "Receives guarantee and insurance premiums from member banks and financial institutions, with additional investment income.",
    "ownershipContext": "Capital is held by the Government of Nepal (90%) and Nepal Rastra Bank (10%).",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 90,
        "kind": "government"
      },
      {
        "label": "Nepal Rastra Bank",
        "percent": 10,
        "kind": "public"
      }
    ]
  },
  "Civil Aviation Authority of Nepal": {
    "earnsFrom": "Airport, landing, parking, passenger and air-navigation charges, alongside other aviation services.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Culture, Tourism and Civil Aviation",
    "ministryUrl": "https://motca.gov.np",
    "websiteUrl": "https://caanepal.gov.np"
  },
  "Nepal Airlines Corporation": {
    "earnsFrom": "Passenger and cargo tickets, charter services and related airline operations.",
    "ownershipContext": "Wholly state-owned national airline.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Operating losses, debt and financing costs affect the net result.",
    "ministry": "Ministry of Culture, Tourism and Civil Aviation",
    "ministryUrl": "https://motca.gov.np",
    "websiteUrl": "https://nepalairlines.com.np"
  },
  "Nepal Water Supply Corporation": {
    "earnsFrom": "Water supply tariffs, connection charges and related customer service fees.",
    "ownershipContext": "Government-owned public utility; the review identifies it as a public enterprise, but the attached record does not itemize shareholders.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ]
  },
  "Dairy Development Corporation": {
    "earnsFrom": "Buys raw milk from farmers, processes it into dairy products and sells those products through distribution channels.",
    "ownershipContext": "Wholly state-owned public enterprise.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Agriculture and Livestock Development",
    "ministryUrl": "https://moald.gov.np",
    "websiteUrl": "https://ddc.gov.np"
  },
  "Udayapur Cement Industries": {
    "earnsFrom": "Cement and clinker production and sales when the plant is operating.",
    "ownershipContext": "Wholly state-owned public enterprise.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Plant utilization, energy costs and maintenance can materially affect annual results.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Hetauda Cement Industry": {
    "earnsFrom": "Cement production and sales when the factory is operating.",
    "ownershipContext": "Wholly state-owned public enterprise.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Plant utilization, energy costs and maintenance can materially affect annual results.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Nepal Metals Company": {
    "earnsFrom": "No current commercial operating revenue is reported while the enterprise remains closed.",
    "ownershipContext": "Government public enterprise; detailed shareholder split is not attached.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Any expenses or income while closed may be administrative or asset-related, not metal production.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Butwal Spinning Mill": {
    "earnsFrom": "No current textile production revenue is reported while the mill remains closed.",
    "ownershipContext": "Government public enterprise; detailed shareholder split is not attached.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Nepal Orind Magnesite Pvt Ltd": {
    "earnsFrom": "No current commercial mining or processing revenue is reported while operations are closed.",
    "ownershipContext": "Government-majority joint venture with private-sector participation. The latest complete split is not verified in the attached record.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Dhaubadi Iron Company": {
    "earnsFrom": "Pre-operational: no commercial iron ore sales are reported yet.",
    "ownershipContext": "Government-owned project company.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "Exploration and development spending may occur before the company earns sales revenue.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Krishi Samagri Company": {
    "earnsFrom": "Imports, procures and distributes fertilizer and agricultural inputs; revenue mainly comes from product sales and distribution.",
    "ownershipContext": "Government-controlled company. The company describes itself as government-owned; a detailed current cap table is not attached here.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ]
  },
  "Agricultural Development Bank": {
    "earnsFrom": "Primarily net interest from agricultural and commercial lending, plus fees, commissions and treasury investments.",
    "ownershipContext": "Listed bank: Government of Nepal 51%, public shareholders 49%.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 51,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 49,
        "kind": "other"
      }
    ],
    "earningsCaveat": "Banking income is not directly comparable with industrial sales.",
    "websiteUrl": "https://adbl.gov.np"
  },
  "Nepal Bank Limited": {
    "earnsFrom": "Primarily net interest from lending, plus account, payment, trade-finance and other banking fees.",
    "ownershipContext": "Listed bank: Government of Nepal 51%, public shareholders 49%.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 51,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 49,
        "kind": "other"
      }
    ],
    "earningsCaveat": "Banking income is not directly comparable with industrial sales.",
    "websiteUrl": "https://nepalbank.com.np"
  },
  "Industrial District Management Limited": {
    "earnsFrom": "Industrial estate lease and rent, utility/service charges and management fees from industrial districts.",
    "ownershipContext": "Government-majority company; latest Ministry table reports 99.69% Government of Nepal ownership.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 99.69,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 0.31,
        "kind": "other"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Herbs Production and Processing Company": {
    "earnsFrom": "Cultivates, procures, processes and sells medicinal and aromatic plant products.",
    "ownershipContext": "Government-majority company; latest Ministry table reports 99.14% Government of Nepal ownership.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 99.14,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 0.86,
        "kind": "other"
      }
    ]
  },
  "Nepal Aushadhi Limited": {
    "earnsFrom": "Manufactures and supplies essential medicines; revenue comes from medicine sales and public procurement contracts.",
    "ownershipContext": "Government-majority company; latest Ministry table reports 99.07% Government of Nepal ownership.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 99.07,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 0.93,
        "kind": "other"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np",
    "websiteUrl": "https://nal.com.np"
  },
  "Food Management and Trading Company": {
    "earnsFrom": "Procures, stores and sells food grains and essential goods, including through government food-security programs.",
    "ownershipContext": "Government-majority company; latest Ministry table reports 98.62% Government of Nepal ownership.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 98.62,
        "kind": "government"
      },
      {
        "label": "Other shareholders",
        "percent": 1.38,
        "kind": "other"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np",
    "websiteUrl": "https://nepalfoods.gov.np"
  },
  "Nepal Ban Nigam": {
    "earnsFrom": "Sells timber and forest products, including products obtained through government forest management and auctions.",
    "ownershipContext": "Government-controlled public enterprise; the review does not show a single direct ownership percentage.",
    "earningsCaveat": "Sales can vary with harvest, auction and forest-management approvals."
  },
  "Nepal Transport and Warehouse Management Company": {
    "earnsFrom": "Warehouse storage, handling, transport and logistics services, including public-sector supply-chain contracts.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Gorkhapatra Corporation": {
    "earnsFrom": "Newspaper and magazine sales, advertising, printing and publication services.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Communication and Information Technology",
    "ministryUrl": "https://mocit.gov.np",
    "websiteUrl": "https://gorkhapatra.org.np"
  },
  "Janak Education Materials Centre": {
    "earnsFrom": "Printing and supplying school textbooks, learning materials and other print services.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "ministry": "Ministry of Education, Science and Technology",
    "ministryUrl": "https://moest.gov.np",
    "websiteUrl": "https://janakedu.org.np"
  },
  "Nepal Housing Company": {
    "earnsFrom": "Property development, housing/land sales and related property income.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ]
  },
  "Janakpur Cigarette Factory": {
    "earnsFrom": "The factory is closed, so the reported small surplus is not from active cigarette production. The Ministry review does not break out the income source; the audited account is needed before attributing it to rent, interest or another item.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ],
    "earningsCaveat": "A positive net result is not evidence that the factory has resumed operations.",
    "ministry": "Ministry of Industry, Commerce and Supplies",
    "ministryUrl": "https://moics.gov.np"
  },
  "Public Service Broadcasting Nepal": {
    "earnsFrom": "Public broadcasting services can be funded by government support and earned income such as advertising, sponsorship and production services; the Ministry review does not split these sources.",
    "ownershipContext": "Current public broadcaster represented by Nepal Television and Radio Nepal; counted once under the consolidated Public Service Broadcasting Nepal entry. Share percentages are not separately stated in the Ministry review.",
    "ministry": "Ministry of Communication and Information Technology",
    "ministryUrl": "https://mocit.gov.np",
    "websiteUrl": "https://ntv.org.np"
  },
  "Cultural Corporation": {
    "earnsFrom": "Ticket sales, venue and event services, cultural productions and related program income.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ]
  },
  "Nepal Purwadhar Nirman Company": {
    "earnsFrom": "Construction, project implementation and infrastructure contracting services.",
    "ownershipContext": "Wholly owned by the Government of Nepal.",
    "ownershipSlices": [
      {
        "label": "Government of Nepal",
        "percent": 100,
        "kind": "government"
      }
    ]
  }
}
