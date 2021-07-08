function airportDump () { // eslint-disable-line no-unused-vars
  const string = `1|LHR|Heathrow
2|SOF|Sofia
3|JFK|John F. Kennedy International
4|SFO|San Francisco International
5|HND|Haneda
6|BLQ|Bologna Guglielmo Marconi
7|CDG|Charles de Gaulle Airport
8|CPH|Copenhagen
9|CRL|Brussels South Charleroi
10|LGW|Gatwick
11|ATH|Athens International
12|LTN|Luton
13|MXP|Milan–Malpensa
14|OSL|Oslo Airport, Gardermoen
15|VNO|Vilnius
16|BOS|Logan International
17|SXF|Berlin Schönefeld
18|STN|London Stansted
19|KEF|Keflavík International
20|AMS|Amsterdam Airport Schiphol
21|LEJ|Leipzig/Halle Airport
22|MAD|Adolfo Suárez Madrid–Barajas
23|WRO|Copernicus Airport Wrocław
24|BCN|Barcelona–El Prat
25|DUS|Düsseldorf International Airport
26|EIN|Eindhoven
27|CIA|Ciampino–G. B. Pastine International CIA
28|NYO|Stockholm Skavsta NYO
29|ARN|Stockholm Arlanda ARN
30|CGN|Cologne Bonn Airport CGN
31|SJC|San Jose International SJC
32|TLV|Ben Gurion TLV
33|HAM|Hamburg HAM
34|BUD|Budapest Ferenc Liszt International BUD
35|FCO|Leonardo da Vinci–Fiumicino Airport FCO
36|NCE|Nice Côte d Azur International NCE
37|PFO|Paphos International PFO
38|BGY|Milan Bergamo International Airport BGY
39|DUB|Dublin DUB
40|LAX|Los Angeles International LAX
41|FMM|Memmingen FMM
42|FRA|Frankfurt International Airport FRA
43|BVA|Beauvais–Tillé BVA
44|ORD|O Hare International ORD
45|KTW|Katowice International KTW
46|GDN|Gdańsk Lech Wałęsa GDN
47|PMI|Palma de Mallorca PMI
48|OPO|Porto OPO
49|EDI|Edinburgh EDI
50|MLA|Malta International MLA
51|BSL|EuroAirport Basel Mulhouse Freiburg BSL
52|CVG|Cincinnati/Northern Kentucky International CVG
53|TXL|Berlin Tegel TXL
54|NAP|Naples International NAP
55|AGP|Málaga AGP
56|POZ|Poznań–Ławica POZ
57|ALC|Alicante–Elche ALC
58|DTM|Dortmund DTM
59|VAR|Varna VAR
60|PSA|Pisa International PSA
61|LIS|Lisbon Portela LIS
62|MAN|Manchester MAN
63|LCA|Larnaca International LCA
64|BOJ|Burgas BOJ
65|RIX|Riga International RIX
66|NUE|Nuremberg NUE
67|WAW|Warsaw Chopin WAW
68|YYZ|Toronto Pearson International YYZ
69|BEG|Belgrade Nikola Tesla BEG
70|HEL|Helsinki HEL
71|LBA|Leeds Bradford LBA
72|MUC|Munich MUC
73|PVD|T. F. Green PVD
74|ORK|Cork ORK
75|IAD|Washington Dulles International IAD
76|SVO|Sheremetyevo International SVO
77|PRG|Václav Havel Airport Prague PRG
78|RSW|Southwest Florida International RSW
79|DRS|Dresden DRS
80|BGO|Bergen Airport, Flesland BGO
81|VIE|Vienna International VIE
82|GLA|Glasgow GLA
83|STR|Stuttgart STR
84|BRU|Brussels BRU
85|BWI|Baltimore–Washington International BWI
86|YYT|St. John's International YYT
87|TSF|Treviso TSF
88|ZRH|Zürich Airport ZRH
89|BHD|George Best Belfast City BHD
90|ABZ|Aberdeen ABZ
91|OTP|Henri Coandă International OTP
92|IBZ|Ibiza IBZ
93|KRK|John Paul II International Airport Kraków–Balice KRK
94|BRI|Bari Karol Wojtyła BRI
95|BLL|Billund BLL
96|VCE|Venice Marco Polo VCE
97|LYS|Lyon–Saint-Exupéry LYS
98|BTS|Bratislava Airport BTS
99|GOT|Göteborg Landvetter GOT`;

  return string.match(/[^\r\n]+/g)
    .map(line => line.split('|'))
    .map(columns => [
      columns[0],
      {
        id: columns[0],
        iataID: columns[1],
        latinName: columns[2],
        nationalName: '',
        cityName: '',
      },
    ])
    .reduce((hash, entry) => {
      hash[entry[0]] = entry[1];
      return hash;
    },
    {}
    );
}
