function airportDump () { // eslint-disable-line no-unused-vars
  const string = '1|LHR|Heathrow' + '\n' +
'2|SOF|Sofia' + '\n' +
'3|JFK|John F. Kennedy International' + '\n' +
'4|SFO|San Francisco International' + '\n' +
'5|HND|Haneda' + '\n' +
'6|BLQ|Bologna Guglielmo Marconi' + '\n' +
'7|CDG|Charles de Gaulle Airport' + '\n' +
'8|CPH|Copenhagen' + '\n' +
'9|CRL|Brussels South Charleroi' + '\n' +
'10|LGW|Gatwick' + '\n' +
'11|ATH|Athens International' + '\n' +
'12|LTN|Luton' + '\n' +
'13|MXP|Milan–Malpensa' + '\n' +
'14|OSL|Oslo Airport, Gardermoen' + '\n' +
'15|VNO|Vilnius' + '\n' +
'16|BOS|Logan International' + '\n' +
'17|SXF|Berlin Schönefeld' + '\n' +
'18|STN|London Stansted' + '\n' +
'19|KEF|Keflavík International' + '\n' +
'20|AMS|Amsterdam Airport Schiphol' + '\n' +
'21|LEJ|Leipzig/Halle Airport' + '\n' +
'22|MAD|Adolfo Suárez Madrid–Barajas' + '\n' +
'23|WRO|Copernicus Airport Wrocław' + '\n' +
'24|BCN|Barcelona–El Prat' + '\n' +
'25|DUS|Düsseldorf International Airport' + '\n' +
'26|EIN|Eindhoven' + '\n' +
'27|CIA|Ciampino–G. B. Pastine International CIA' + '\n' +
'28|NYO|Stockholm Skavsta NYO' + '\n' +
'29|ARN|Stockholm Arlanda ARN' + '\n' +
'30|CGN|Cologne Bonn Airport CGN' + '\n' +
'31|SJC|San Jose International SJC' + '\n' +
'32|TLV|Ben Gurion TLV' + '\n' +
'33|HAM|Hamburg HAM' + '\n' +
'34|BUD|Budapest Ferenc Liszt International BUD' + '\n' +
'35|FCO|Leonardo da Vinci–Fiumicino Airport FCO' + '\n' +
'36|NCE|Nice Côte d Azur International NCE' + '\n' +
'37|PFO|Paphos International PFO' + '\n' +
'38|BGY|Milan Bergamo International Airport BGY' + '\n' +
'39|DUB|Dublin DUB' + '\n' +
'40|LAX|Los Angeles International LAX' + '\n' +
'41|FMM|Memmingen FMM' + '\n' +
'42|FRA|Frankfurt International Airport FRA' + '\n' +
'43|BVA|Beauvais–Tillé BVA' + '\n' +
'44|ORD|O Hare International ORD' + '\n' +
'45|KTW|Katowice International KTW' + '\n' +
'46|GDN|Gdańsk Lech Wałęsa GDN' + '\n' +
'47|PMI|Palma de Mallorca PMI' + '\n' +
'48|OPO|Porto OPO' + '\n' +
'49|EDI|Edinburgh EDI' + '\n' +
'50|MLA|Malta International MLA' + '\n' +
'51|BSL|EuroAirport Basel Mulhouse Freiburg BSL' + '\n' +
'52|CVG|Cincinnati/Northern Kentucky International CVG' + '\n' +
'53|TXL|Berlin Tegel TXL' + '\n' +
'54|NAP|Naples International NAP' + '\n' +
'55|AGP|Málaga AGP' + '\n' +
'56|POZ|Poznań–Ławica POZ' + '\n' +
'57|ALC|Alicante–Elche ALC' + '\n' +
'58|DTM|Dortmund DTM' + '\n' +
'59|VAR|Varna VAR' + '\n' +
'60|PSA|Pisa International PSA' + '\n' +
'61|LIS|Lisbon Portela LIS' + '\n' +
'62|MAN|Manchester MAN' + '\n' +
'63|LCA|Larnaca International LCA' + '\n' +
'64|BOJ|Burgas BOJ' + '\n' +
'65|RIX|Riga International RIX' + '\n' +
'66|NUE|Nuremberg NUE' + '\n' +
'67|WAW|Warsaw Chopin WAW' + '\n' +
'68|YYZ|Toronto Pearson International YYZ' + '\n' +
'69|BEG|Belgrade Nikola Tesla BEG' + '\n' +
'70|HEL|Helsinki HEL' + '\n' +
'71|LBA|Leeds Bradford LBA' + '\n' +
'72|MUC|Munich MUC' + '\n' +
'73|PVD|T. F. Green PVD' + '\n' +
'74|ORK|Cork ORK' + '\n' +
'75|IAD|Washington Dulles International IAD' + '\n' +
'76|SVO|Sheremetyevo International SVO' + '\n' +
'77|PRG|Václav Havel Airport Prague PRG' + '\n' +
'78|RSW|Southwest Florida International RSW' + '\n' +
'79|DRS|Dresden DRS' + '\n' +
'80|BGO|Bergen Airport, Flesland BGO' + '\n' +
'81|VIE|Vienna International VIE' + '\n' +
'82|GLA|Glasgow GLA' + '\n' +
'83|STR|Stuttgart STR' + '\n' +
'84|BRU|Brussels BRU' + '\n' +
'85|BWI|Baltimore–Washington International BWI' + '\n' +
'86|YYT|St. John\'s International YYT' + '\n' +
'87|TSF|Treviso TSF' + '\n' +
'88|ZRH|Zürich Airport ZRH' + '\n' +
'89|BHD|George Best Belfast City BHD' + '\n' +
'90|ABZ|Aberdeen ABZ' + '\n' +
'91|OTP|Henri Coandă International OTP' + '\n' +
'92|IBZ|Ibiza IBZ' + '\n' +
'93|KRK|John Paul II International Airport Kraków–Balice KRK' + '\n' +
'94|BRI|Bari Karol Wojtyła BRI' + '\n' +
'95|BLL|Billund BLL' + '\n' +
'96|VCE|Venice Marco Polo VCE' + '\n' +
'97|LYS|Lyon–Saint-Exupéry LYS' + '\n' +
'98|BTS|Bratislava Airport BTS' + '\n' +
'99|GOT|Göteborg Landvetter GOT';

  return string.match(/[^\r\n]+/g)
    .map(function (line) { // eslint-disable-line prefer-arrow-callback
      return line.split('|');
    }).map(function (columns) { // eslint-disable-line prefer-arrow-callback
      return [
        columns[0],
        {
          id: columns[0],
          iataID: columns[1],
          latinName: columns[2],
          nationalName: '',
          cityName: '',
        },
      ];
    })
    .reduce(function (hash, entry) { // eslint-disable-line prefer-arrow-callback
      hash[entry[0]] = entry[1];
      return hash;
    },
    {}
    );
}
