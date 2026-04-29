(function () {
  const E = window.EcoBuddy;
  const LANG = (E && E.lang) || 'en';
  const I = (E && E.i18n) || {};
  const form = document.getElementById('calcForm');
  let chart;

  const FACTORS = {
    transport: { car: 0.21, bike: 0.10, bus: 0.05, train: 0.04, walk: 0.0 },
    electricity: 0.82,
    waste: { bio: 0.7, nonbio: 2.9 },
  };

  const CAT_META = {
    transport: { color: '#22c55e' },
    energy:    { color: '#f59e0b' },
    waste:     { color: '#a855f7' },
  };

  // Bilingual strings used by reports
  const STR = {
    en: {
      report_t: 'Transport report', report_e: 'Energy report', report_w: 'Waste report',
      sub_t: (km, m) => km + ' km by ' + m,
      sub_e: (k) => k + ' kWh of electricity',
      sub_w: (b, n) => b + ' kg bio + ' + n + ' kg non-bio',
      no_data: 'No data', impact_low: 'Low impact', impact_mid: 'Moderate impact',
      impact_high: 'High impact', impact_very: 'Very high impact',
      meta_dist: 'Distance', meta_mode: 'Mode', meta_factor: 'Factor',
      meta_trees: 'Trees needed (yearly)', meta_elec: 'Electricity',
      meta_equiv: 'Equivalent', meta_phones: 'phone charges',
      meta_bio: 'Biodegradable', meta_nonbio: 'Non-biodegradable',
      meta_total_w: 'Total waste',
      meta_bio_co2: 'Bio CO\u2082', meta_nonbio_co2: 'Non-bio CO\u2082',
      meta_est: '(est.)',
      m_car: 'Car', m_bike: 'Bike', m_bus: 'Bus', m_train: 'Train', m_walk: 'Walk',
      cmp_india: 'India avg/day', cmp_global: 'Global avg/day', cmp_you: 'You',
      cmp_bio: 'Biodegradable', cmp_nonbio: 'Non-biodegradable',
      // savings
      sv_bus_save: (kg) => 'Taking the bus instead would save ' + kg + ' kg CO\u2082 today.',
      sv_train_save: (kg) => 'A train ride would save ' + kg + ' kg CO\u2082 today.',
      sv_bike_save: (kg) => 'You saved ' + kg + ' kg CO\u2082 vs driving the same distance by car.',
      sv_walk_save: (kg) => 'Zero-emission trip! You saved ' + kg + ' kg CO\u2082 vs driving.',
      sv_add_dist: 'Add some distance to see your savings vs other modes.',
      sv_led: 'Switching 5 bulbs to LEDs saves ~0.4 kWh (~0.33 kg CO\u2082) per evening.',
      sv_ac: 'Raising AC by 1\u00B0C cuts ~6% of cooling energy use.',
      sv_unplug: 'Unplugging idle electronics saves up to 1 kWh/day in many homes.',
      sv_kwh_hint: 'Enter your daily kWh from your meter or bill to see savings tips.',
      sv_compost: (kg) => 'Composting your biodegradable waste at home would save ~' + kg + ' kg CO\u2082 today.',
      sv_recycle: (kg) => 'Recycling plastic/metal/glass instead of trashing would save ~' + kg + ' kg CO\u2082 today.',
      sv_bulk: 'Buy in bulk and refuse single-use packaging to slash non-biodegradable waste.',
      sv_donate: 'Donating clothes & electronics keeps materials in use longer.',
      sv_waste_hint: 'Enter how much biodegradable and non-biodegradable waste you generated to see savings tips.',
      // precautions
      pc_helmet: 'Wear a helmet, hi-vis gear, and stay hydrated for long rides.',
      pc_mask: 'Use a mask in heavy traffic to limit PM2.5 exposure.',
      pc_service: 'Keep tires properly inflated and service the engine \u2014 it cuts emissions and breakdown risk.',
      pc_sanitize: 'Carry hand sanitizer in crowded transit and avoid touching your face.',
      pc_break: 'Long trips: take a 5-minute break every hour to stay alert.',
      pc_low_tx: 'Great choice. Keep favoring low-emission transport whenever possible.',
      pc_e_overload: 'Heavy load \u2014 avoid overloading sockets and check appliance wattage to prevent fires.',
      pc_e_breaker: 'Get an electrician check if breakers trip often or wires feel warm.',
      pc_e_phantom: 'Unplug chargers and devices on standby; many draw "phantom" power.',
      pc_e_meter: 'Track your meter weekly \u2014 spotting spikes early prevents big bills.',
      pc_e_zero: 'No energy logged today. If you cooked or used lights, add an estimate to keep records honest.',
      pc_w_gloves: 'Wear gloves when sorting waste and wash hands afterward.',
      pc_w_haz: 'Keep batteries, paint, and e-waste out of regular bins \u2014 use designated drop-offs.',
      pc_w_seal: 'High volume \u2014 store in sealed bins to keep pests away and prevent odor.',
      pc_w_quick: 'Dispose promptly; standing waste attracts insects and rodents.',
      pc_w_burn: 'Never burn plastic at home \u2014 it releases dioxins and damages the lungs.',
      pc_w_separate: 'Always keep biodegradable and non-biodegradable bins separate to enable recycling.',
      // reduce CO2 tips
      rd_t1: 'Carpool with 2+ people \u2014 cuts your per-person CO\u2082 by 50\u201375%.',
      rd_t2: 'Combine errands into a single trip to save fuel and time.',
      rd_t3: 'Work from home one day a week saves about 2 kg CO\u2082 per day.',
      rd_t4: 'Use a cycle or walk for trips under 5 km.',
      rd_t5: 'Plan routes to avoid traffic; idling burns fuel without moving.',
      rd_e1: 'Switch to LED bulbs \u2014 they use 75% less energy than incandescents.',
      rd_e2: 'Set AC to 26\u00B0C and run a fan \u2014 each degree saves ~6%.',
      rd_e3: 'Air-dry clothes instead of using a dryer.',
      rd_e4: 'Use natural daylight; turn off lights you aren\u2019t using.',
      rd_e5: 'Insulate doors and windows to cut heating and cooling losses.',
      rd_e6: 'Wash clothes in cold water and full loads.',
      rd_w1: 'Carry a reusable bottle and a cloth bag everywhere.',
      rd_w2: 'Refuse single-use plastic straws, cutlery, and packaging.',
      rd_w3: 'Compost vegetable scraps and garden waste at home.',
      rd_w4: 'Repair clothes and gadgets instead of replacing them.',
      rd_w5: 'Donate or sell items you no longer use.',
      rd_w6: 'Sort recyclables (paper, glass, metal) properly.',
      rd_offset: (n) => 'Plant or sponsor about ' + n + ' tree(s) this year to offset today\u2019s footprint over time.',

      // pollution-impact "powerful" recommendations
      pw_tag_low:  'Low pollution',
      pw_tag_mid:  'Moderate pollution',
      pw_tag_high: 'High pollution',
      pw_tag_very: 'Very high pollution',
      pw_intro_low:  (kg) => 'Today you released ' + kg + ' kg CO\u2082 \u2014 below the global daily average. Lock in this habit and you can save 100+ kg this year.',
      pw_intro_mid:  (kg) => 'Today you released ' + kg + ' kg CO\u2082 \u2014 close to the global daily average. A couple of focused habit changes can pull you well below it.',
      pw_intro_high: (kg) => '\u26A0 Today you released ' + kg + ' kg CO\u2082 \u2014 above average. The actions below can cut hundreds of kg of pollution this year.',
      pw_intro_very: (kg) => '\u{1F525} Today you released ' + kg + ' kg CO\u2082 \u2014 over 2x the global average. Bold action below will compound into a tonne-scale yearly cut.',

      pw_eq_drive: (km) => '\u{1F4CF} That equals roughly ' + km + ' km of driving a typical petrol car.',
      pw_eq_phones: (n) => '\u{1F50B} Same as charging your phone about ' + n + ' times.',
      pw_eq_trees: (n) => '\u{1F333} It takes ~' + n + ' mature tree(s) a full year to absorb today\u2019s CO\u2082.',
      pw_eq_aqi: '\u{1F32B} CO\u2082 itself is a heat-trapping gas; the same activities (vehicles, burning) also raise local PM2.5/AQI \u2014 cutting them helps your lungs too.',

      pw_t_high1: '\u{1F69C} Switch your daily commute to bus, metro, or carpool \u2014 cuts up to 70% of personal transport CO\u2082.',
      pw_t_high2: '\u{1F4BB} Negotiate 1\u20132 work-from-home days/week \u2014 saves ~100 kg CO\u2082/month for many commuters.',
      pw_t_high3: '\u26FD Service the engine and keep tires inflated \u2014 a poorly tuned vehicle emits 15\u201325% more.',
      pw_t_high4: '\u{1F50B} Plan your next vehicle as electric or hybrid \u2014 lifecycle CO\u2082 drops 50\u201370% on grid power.',
      pw_t_low1:  '\u{1F31F} Keep public transport, cycling, or walking as your default \u2014 you\u2019re already winning.',

      pw_e_high1: '\u2600 Install a solar water heater \u2014 saves ~1,500 kg CO\u2082/year for a family of four.',
      pw_e_high2: '\u{1F31E} Add rooftop solar (even 1 kW) \u2014 cuts ~1,200 kg CO\u2082/year vs grid power.',
      pw_e_high3: '\u2744 Set AC to 26\u00B0C and use ceiling fans \u2014 each degree higher saves ~6% of cooling power.',
      pw_e_high4: '\u2B50 Replace old fridges/ACs with 5-star rated ones \u2014 30\u201340% less electricity.',
      pw_e_low1:  '\u{1F4A1} Audit phantom loads with a smart plug \u2014 most homes still leak 5\u201310% standby power.',

      pw_w_high1: '\u{1F95C} Compost ALL biodegradable waste at home \u2014 prevents methane (~25x worse than CO\u2082) from landfills.',
      pw_w_high2: '\u267B Refuse single-use plastic completely for a week \u2014 cuts non-bio waste by 30\u201350% in most homes.',
      pw_w_high3: '\u{1F4F1} Drop e-waste at certified recyclers \u2014 1 kg of e-waste recycled saves ~3 kg CO\u2082 vs landfill.',
      pw_w_high4: '\u{1F6CD} Buy in bulk with reusable containers \u2014 packaging is the largest non-bio category.',
      pw_w_low1:  '\u267B Stay consistent with sorted bins; recycling rates climb when sorting becomes habit.',
    },
    hi: {
      report_t: 'परिवहन रिपोर्ट', report_e: 'ऊर्जा रिपोर्ट', report_w: 'कचरा रिपोर्ट',
      sub_t: (km, m) => km + ' कि.मी. ' + m + ' से',
      sub_e: (k) => k + ' kWh बिजली',
      sub_w: (b, n) => b + ' कि.ग्रा. जैविक + ' + n + ' कि.ग्रा. गैर-जैविक',
      no_data: 'कोई डेटा नहीं', impact_low: 'कम प्रभाव', impact_mid: 'मध्यम प्रभाव',
      impact_high: 'अधिक प्रभाव', impact_very: 'बहुत अधिक प्रभाव',
      meta_dist: 'दूरी', meta_mode: 'साधन', meta_factor: 'गुणांक',
      meta_trees: 'पेड़ चाहिए (वार्षिक)', meta_elec: 'बिजली',
      meta_equiv: 'बराबर', meta_phones: 'फ़ोन चार्ज',
      meta_bio: 'जैव-अपघटनीय', meta_nonbio: 'गैर-जैव-अपघटनीय',
      meta_total_w: 'कुल कचरा',
      meta_bio_co2: 'जैविक CO\u2082', meta_nonbio_co2: 'गैर-जैविक CO\u2082',
      meta_est: '(अनुमानित)',
      m_car: 'कार', m_bike: 'बाइक', m_bus: 'बस', m_train: 'ट्रेन', m_walk: 'पैदल',
      cmp_india: 'भारत औसत/दिन', cmp_global: 'वैश्विक औसत/दिन', cmp_you: 'आप',
      cmp_bio: 'जैव-अपघटनीय', cmp_nonbio: 'गैर-जैव-अपघटनीय',
      sv_bus_save: (kg) => 'बस लेने पर आज ' + kg + ' कि.ग्रा. CO\u2082 बचती।',
      sv_train_save: (kg) => 'ट्रेन से आज ' + kg + ' कि.ग्रा. CO\u2082 बचती।',
      sv_bike_save: (kg) => 'कार के बजाय यह यात्रा करने से आपने ' + kg + ' कि.ग्रा. CO\u2082 बचाई।',
      sv_walk_save: (kg) => 'शून्य-उत्सर्जन यात्रा! कार के बजाय आपने ' + kg + ' कि.ग्रा. CO\u2082 बचाई।',
      sv_add_dist: 'दूसरे साधनों से तुलना देखने के लिए दूरी दर्ज करें।',
      sv_led: '5 बल्ब LED से बदलने पर हर शाम ~0.4 kWh (~0.33 कि.ग्रा. CO\u2082) बचती है।',
      sv_ac: 'AC 1\u00B0C बढ़ाने पर ~6% कूलिंग ऊर्जा बचती है।',
      sv_unplug: 'बेकार उपकरण अनप्लग करने से कई घरों में 1 kWh/दिन बचता है।',
      sv_kwh_hint: 'मीटर या बिल से आज का kWh दर्ज करें।',
      sv_compost: (kg) => 'घर पर जैविक कचरे की खाद बनाने से आज लगभग ' + kg + ' कि.ग्रा. CO\u2082 बचेगी।',
      sv_recycle: (kg) => 'प्लास्टिक/धातु/काँच रीसायकल करने से आज लगभग ' + kg + ' कि.ग्रा. CO\u2082 बचेगी।',
      sv_bulk: 'थोक में खरीदें और एक-बार उपयोग वाली पैकेजिंग मना करें।',
      sv_donate: 'कपड़े व इलेक्ट्रॉनिक्स दान करने से चीज़ें लंबे समय तक उपयोग में रहती हैं।',
      sv_waste_hint: 'जैविक और गैर-जैविक कचरा अलग-अलग दर्ज करें ताकि बचत के सुझाव दिख सकें।',
      pc_helmet: 'लंबी सवारी पर हेलमेट, चमकदार जैकेट पहनें और पानी पीते रहें।',
      pc_mask: 'भारी ट्रैफ़िक में मास्क लगाएँ ताकि PM2.5 से बचाव हो।',
      pc_service: 'टायर का दबाव सही रखें और इंजन की सर्विस कराएँ \u2014 उत्सर्जन और ख़राबी कम होगी।',
      pc_sanitize: 'भीड़ वाले परिवहन में सैनिटाइज़र रखें और चेहरे को न छुएँ।',
      pc_break: 'लंबी यात्रा: हर घंटे 5 मिनट का ब्रेक लें।',
      pc_low_tx: 'बहुत अच्छा! जब भी संभव हो, कम-उत्सर्जन परिवहन चुनें।',
      pc_e_overload: 'भारी लोड \u2014 सॉकेट को ओवरलोड न करें, उपकरणों की वाट क्षमता जाँचें (आग का ख़तरा)।',
      pc_e_breaker: 'अगर ब्रेकर बार-बार ट्रिप होता है या तार गर्म लगते हैं तो इलेक्ट्रिशियन से जाँच कराएँ।',
      pc_e_phantom: 'चार्जर और स्टैंडबाय उपकरण अनप्लग करें; कई "फैंटम" पावर खींचते हैं।',
      pc_e_meter: 'मीटर साप्ताहिक देखें \u2014 अचानक उछाल जल्दी पकड़ने से बिल कम रहेगा।',
      pc_e_zero: 'आज कोई ऊर्जा दर्ज नहीं हुई। अगर खाना बनाया या लाइट जलाई तो अनुमान दर्ज करें।',
      pc_w_gloves: 'कचरा छाँटते समय दस्ताने पहनें और बाद में हाथ धोएँ।',
      pc_w_haz: 'बैटरी, पेंट, ई-कचरा सामान्य कूड़े में न डालें \u2014 निर्धारित जगह पर दें।',
      pc_w_seal: 'अधिक मात्रा \u2014 बंद डिब्बे में रखें ताकि कीट और बदबू न आए।',
      pc_w_quick: 'जल्दी निपटाएँ; पड़ा कचरा कीट-कीड़े-चूहे आकर्षित करता है।',
      pc_w_burn: 'घर पर प्लास्टिक कभी न जलाएँ \u2014 इससे डायऑक्सिन निकलती है जो फेफड़ों को नुक़सान पहुँचाती है।',
      pc_w_separate: 'जैविक और गैर-जैविक कचरा हमेशा अलग रखें ताकि पुनर्चक्रण संभव हो।',
      rd_t1: '2+ लोगों के साथ कारपूल \u2014 प्रति-व्यक्ति CO\u2082 50\u201375% कम।',
      rd_t2: 'कई काम एक ही चक्कर में निपटाएँ \u2014 ईंधन और समय बचेगा।',
      rd_t3: 'हफ़्ते में एक दिन वर्क-फ्रॉम-होम \u2014 लगभग 2 कि.ग्रा. CO\u2082 बचत/दिन।',
      rd_t4: '5 कि.मी. से कम की यात्रा साइकिल या पैदल करें।',
      rd_t5: 'ट्रैफ़िक से बचें; idling में ईंधन बेकार जलता है।',
      rd_e1: 'LED बल्ब अपनाएँ \u2014 इन्कैन्डेसेंट से 75% कम ऊर्जा।',
      rd_e2: 'AC 26\u00B0C पर रखें और पंखा चलाएँ \u2014 हर डिग्री ~6% बचत।',
      rd_e3: 'कपड़े धूप में सुखाएँ, ड्रायर का इस्तेमाल कम करें।',
      rd_e4: 'दिन में प्राकृतिक रोशनी का उपयोग करें; गैर-ज़रूरी लाइटें बंद रखें।',
      rd_e5: 'दरवाज़े/खिड़कियाँ इन्सुलेट करें ताकि गर्मी/ठंड का नुक़सान कम हो।',
      rd_e6: 'कपड़े ठंडे पानी में और भरी हुई मशीन में धोएँ।',
      rd_w1: 'अपनी रीयूज़ेबल बोतल और कपड़े का बैग साथ रखें।',
      rd_w2: 'सिंगल-यूज़ प्लास्टिक स्ट्रॉ, चम्मच, पैकेजिंग को मना करें।',
      rd_w3: 'घर पर ही सब्ज़ी के छिलकों और बागवानी कचरे की खाद बनाएँ।',
      rd_w4: 'कपड़े और गैजेट बदलने से पहले मरम्मत कराएँ।',
      rd_w5: 'जो वस्तुएँ आप उपयोग नहीं करते उन्हें दान करें या बेचें।',
      rd_w6: 'पुनर्चक्रण योग्य कचरे (कागज़, काँच, धातु) को सही से छाँटें।',
      rd_offset: (n) => 'इस साल लगभग ' + n + ' पेड़ लगाएँ या प्रायोजित करें ताकि आज का फुटप्रिंट संतुलित हो।',

      pw_tag_low:  'कम प्रदूषण',
      pw_tag_mid:  'मध्यम प्रदूषण',
      pw_tag_high: 'अधिक प्रदूषण',
      pw_tag_very: 'बहुत अधिक प्रदूषण',
      pw_intro_low:  (kg) => 'आज आपने ' + kg + ' कि.ग्रा. CO\u2082 छोड़ी \u2014 वैश्विक औसत से कम। यही आदत बनाए रखें तो साल भर में 100+ कि.ग्रा. की बचत संभव है।',
      pw_intro_mid:  (kg) => 'आज आपने ' + kg + ' कि.ग्रा. CO\u2082 छोड़ी \u2014 लगभग वैश्विक औसत के बराबर। दो-तीन आदतें बदलकर आप इससे काफ़ी नीचे आ सकते हैं।',
      pw_intro_high: (kg) => '\u26A0 आज आपने ' + kg + ' कि.ग्रा. CO\u2082 छोड़ी \u2014 औसत से अधिक। नीचे दिए कदम साल भर में सैकड़ों कि.ग्रा. प्रदूषण घटा सकते हैं।',
      pw_intro_very: (kg) => '\u{1F525} आज आपने ' + kg + ' कि.ग्रा. CO\u2082 छोड़ी \u2014 वैश्विक औसत का 2 गुना से अधिक। नीचे दिए ज़बरदस्त कदम पूरे टन-स्तर की वार्षिक कटौती लाएँगे।',

      pw_eq_drive: (km) => '\u{1F4CF} यह लगभग ' + km + ' कि.मी. कार चलाने के बराबर है।',
      pw_eq_phones: (n) => '\u{1F50B} फ़ोन को लगभग ' + n + ' बार चार्ज करने के बराबर।',
      pw_eq_trees: (n) => '\u{1F333} आज की CO\u2082 सोखने में लगभग ' + n + ' परिपक्व पेड़ों को पूरा साल लगता है।',
      pw_eq_aqi: '\u{1F32B} CO\u2082 तो ग्रीनहाउस गैस है ही, उसे पैदा करने वाले स्रोत (वाहन, जलाना) PM2.5/AQI भी बढ़ाते हैं \u2014 इन्हें घटाने से आपके फेफड़े भी बचेंगे।',

      pw_t_high1: '\u{1F69C} रोज़ का सफ़र बस/मेट्रो/कारपूल से करें \u2014 निजी परिवहन का 70% तक CO\u2082 कम।',
      pw_t_high2: '\u{1F4BB} हफ़्ते में 1\u20132 दिन वर्क-फ्रॉम-होम \u2014 कई लोगों की ~100 कि.ग्रा. CO\u2082/माह बचत।',
      pw_t_high3: '\u26FD इंजन की सर्विस कराएँ और टायर हवा सही रखें \u2014 ख़राब ट्यूनिंग से 15\u201325% अधिक उत्सर्जन।',
      pw_t_high4: '\u{1F50B} अगला वाहन इलेक्ट्रिक/हाइब्रिड लें \u2014 लाइफ़साइकिल CO\u2082 50\u201370% तक कम।',
      pw_t_low1:  '\u{1F31F} सार्वजनिक परिवहन/साइकिल/पैदल को डिफ़ॉल्ट बनाए रखें \u2014 आप पहले से ही जीत रहे हैं।',

      pw_e_high1: '\u2600 सोलर वाटर हीटर लगाएँ \u2014 चार लोगों के परिवार में ~1,500 कि.ग्रा. CO\u2082/साल बचत।',
      pw_e_high2: '\u{1F31E} छत पर 1 kW सोलर भी लगाएँ \u2014 ग्रिड बिजली के मुक़ाबले ~1,200 कि.ग्रा. CO\u2082/साल कम।',
      pw_e_high3: '\u2744 AC 26\u00B0C पर रखें और पंखा चलाएँ \u2014 हर डिग्री बढ़ाने पर ~6% बचत।',
      pw_e_high4: '\u2B50 पुराने फ्रिज/AC को 5-स्टार रेटेड से बदलें \u2014 30\u201340% कम बिजली।',
      pw_e_low1:  '\u{1F4A1} स्मार्ट प्लग से फैंटम लोड पकड़ें \u2014 कई घर अब भी 5\u201310% स्टैंडबाय बिजली खर्च करते हैं।',

      pw_w_high1: '\u{1F95C} सारा जैविक कचरा घर पर ही खाद बनाएँ \u2014 लैंडफिल की मीथेन (CO\u2082 से ~25 गुना ज़्यादा हानिकारक) रुकती है।',
      pw_w_high2: '\u267B एक हफ़्ते सिंगल-यूज़ प्लास्टिक से पूरी तरह दूर रहें \u2014 गैर-जैविक कचरा 30\u201350% तक कम।',
      pw_w_high3: '\u{1F4F1} ई-कचरा प्रमाणित रीसायकलर को दें \u2014 1 कि.ग्रा. ई-कचरा रीसायकल = ~3 कि.ग्रा. CO\u2082 बचत।',
      pw_w_high4: '\u{1F6CD} थोक में और रीयूज़ेबल कंटेनर के साथ ख़रीदारी करें \u2014 पैकेजिंग सबसे बड़ा गैर-जैविक हिस्सा है।',
      pw_w_low1:  '\u267B छाँटे हुए डिब्बे की आदत बनाए रखें; आदत बनने पर रीसायकलिंग दर तेज़ी से बढ़ती है।',
    }
  };

  const T = STR[LANG] || STR.en;

  // Build a bilingual string: "English / Hindi" (or "Hindi / English" in HI mode)
  function dual(key /*, ...args */) {
    const args = Array.prototype.slice.call(arguments, 1);
    const en = STR.en[key], hi = STR.hi[key];
    const enText = (typeof en === 'function') ? en.apply(null, args) : en;
    const hiText = (typeof hi === 'function') ? hi.apply(null, args) : hi;
    if (LANG === 'hi') return hiText + ' / ' + enText;
    return enText + ' / ' + hiText;
  }

  function modeLabel(m) {
    return ({ car: T.m_car, bike: T.m_bike, bus: T.m_bus, train: T.m_train, walk: T.m_walk })[m] || m;
  }

  function selectedCat() {
    const r = document.querySelector('input[name="catChoice"]:checked');
    return r ? r.value : 'transport';
  }

  function syncBlocks() {
    const cur = selectedCat();
    ['transport', 'energy', 'waste'].forEach(c => {
      const block = document.querySelector('[data-block="' + c + '"]');
      if (block) block.style.display = c === cur ? '' : 'none';
    });
  }

  document.querySelectorAll('input[name="catChoice"]').forEach(r =>
    r.addEventListener('change', () => { syncBlocks(); resetReport(); })
  );
  syncBlocks();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setImpact(total, cat) {
    const tag = document.getElementById('impactTag');
    if (!tag) return;
    const thresholds = {
      transport: [1, 3, 6], energy: [3, 8, 15],
      waste: [1, 2, 4],
    };
    const th = thresholds[cat] || [3, 8, 15];
    let label, cls;
    if (total <= 0) { label = T.no_data; cls = 'impact-na'; }
    else if (total < th[0]) { label = T.impact_low; cls = 'impact-low'; }
    else if (total < th[1]) { label = T.impact_mid; cls = 'impact-mid'; }
    else if (total < th[2]) { label = T.impact_high; cls = 'impact-high'; }
    else { label = T.impact_very; cls = 'impact-very'; }
    tag.textContent = label;
    tag.className = 'impact-tag ' + cls;
  }

  function pollutionTier(total, cat) {
    const thresholds = {
      transport: [1, 3, 6], energy: [3, 8, 15], waste: [1, 2, 4],
    };
    const th = thresholds[cat] || [3, 8, 15];
    if (total <= 0) return 'na';
    if (total < th[0]) return 'low';
    if (total < th[1]) return 'mid';
    if (total < th[2]) return 'high';
    return 'very';
  }

  function renderMeta(items) {
    document.getElementById('reportMeta').innerHTML = items.map(i =>
      '<li><span class="muted small">' + escapeHtml(i.label) + '</span><strong>' + escapeHtml(i.value) + '</strong></li>'
    ).join('');
  }

  function renderTipList(id, tips) {
    document.getElementById(id).innerHTML = tips.map(t =>
      '<li><span class="tip-icon">' + t.icon + '</span><span>' + escapeHtml(t.text) + '</span></li>'
    ).join('');
  }

  function drawChart(cat, value, comparisons) {
    const ctx = document.getElementById('reportChart');
    if (!ctx) return;
    chart && chart.destroy();
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [T.cmp_you].concat(comparisons.map(c => c.label)),
        datasets: [{
          data: [value].concat(comparisons.map(c => c.value)),
          backgroundColor: [CAT_META[cat].color].concat(comparisons.map(() => 'rgba(120,140,130,.35)')),
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ctx.parsed.y.toFixed(2) + ' kg CO\u2082' } },
        },
        scales: {
          x: { ticks: { color: E.chartTextColor() }, grid: { display: false } },
          y: { ticks: { color: E.chartTextColor() }, grid: { color: E.chartGridColor() }, beginAtZero: true },
        },
      },
    });
  }

  function transportReport(km, mode) {
    const total = km * FACTORS.transport[mode];
    const comparisons = ['car', 'bus', 'train']
      .filter(m => m !== mode)
      .map(m => ({ label: modeLabel(m), value: +(km * FACTORS.transport[m]).toFixed(2) }));

    const meta = [
      { label: T.meta_dist, value: km.toFixed(1) + ' km' },
      { label: T.meta_mode, value: modeLabel(mode) },
      { label: T.meta_factor, value: FACTORS.transport[mode].toFixed(2) + ' kg/km' },
      { label: T.meta_trees, value: Math.max(1, Math.ceil(total * 365 / 21)).toString() },
    ];

    const savings = [];
    if (mode === 'car' && km > 0) {
      const busSave = +(km * (FACTORS.transport.car - FACTORS.transport.bus)).toFixed(2);
      const trainSave = +(km * (FACTORS.transport.car - FACTORS.transport.train)).toFixed(2);
      savings.push({ icon: '\u{1F68C}', text: dual('sv_bus_save', busSave) });
      savings.push({ icon: '\u{1F683}', text: dual('sv_train_save', trainSave) });
    } else if (mode === 'bike' && km > 0) {
      const carDiff = +(km * (FACTORS.transport.car - FACTORS.transport.bike)).toFixed(2);
      savings.push({ icon: '\u{1F44D}', text: dual('sv_bike_save', carDiff) });
    } else if (mode === 'walk' && km > 0) {
      const carDiff = +(km * FACTORS.transport.car).toFixed(2);
      savings.push({ icon: '\u{1F3C5}', text: dual('sv_walk_save', carDiff) });
    } else {
      savings.push({ icon: '\u2728', text: dual('sv_add_dist') });
    }

    const precautions = [];
    if (km > 0 && (mode === 'bike' || mode === 'walk')) {
      precautions.push({ icon: '\u{1FA7A}', text: dual('pc_helmet') });
      precautions.push({ icon: '\u{1F6E1}', text: dual('pc_mask') });
    }
    if (mode === 'car' || mode === 'bike') precautions.push({ icon: '\u{1F527}', text: dual('pc_service') });
    if (mode === 'bus' || mode === 'train') precautions.push({ icon: '\u{1F637}', text: dual('pc_sanitize') });
    if (km > 30) precautions.push({ icon: '\u23F1', text: dual('pc_break') });
    if (precautions.length === 0) precautions.push({ icon: '\u{1F331}', text: dual('pc_low_tx') });

    const reduce = [
      { icon: '\u{1F465}', text: dual('rd_t1') }, { icon: '\u{1F4CD}', text: dual('rd_t2') },
      { icon: '\u{1F3E0}', text: dual('rd_t3') }, { icon: '\u{1F6B4}', text: dual('rd_t4') },
      { icon: '\u{1F4C5}', text: dual('rd_t5') },
      { icon: '\u{1F333}', text: dual('rd_offset', Math.max(1, Math.ceil(total * 365 / 21))) },
    ];

    return { total, comparisons, meta, savings, precautions, reduce,
             title: T.report_t, subtitle: T.sub_t(km.toFixed(1), modeLabel(mode)) };
  }

  function energyReport(kwh) {
    const total = kwh * FACTORS.electricity;
    const comparisons = [
      { label: T.cmp_india, value: 3 },
      { label: T.cmp_global, value: 11 },
    ];
    const meta = [
      { label: T.meta_elec, value: kwh.toFixed(1) + ' kWh' },
      { label: T.meta_factor, value: FACTORS.electricity.toFixed(2) + ' kg/kWh' },
      { label: T.meta_equiv, value: (total / 0.4).toFixed(1) + ' ' + T.meta_phones },
      { label: T.meta_trees, value: Math.max(1, Math.ceil(total * 365 / 21)).toString() },
    ];

    const savings = [];
    if (kwh > 0) {
      savings.push({ icon: '\u{1F4A1}', text: dual('sv_led') });
      savings.push({ icon: '\u{1F4A8}', text: dual('sv_ac') });
      savings.push({ icon: '\u{1F50C}', text: dual('sv_unplug') });
    } else {
      savings.push({ icon: '\u2728', text: dual('sv_kwh_hint') });
    }

    const precautions = [];
    if (kwh > 15) {
      precautions.push({ icon: '\u{1F525}', text: dual('pc_e_overload') });
      precautions.push({ icon: '\u26A0', text: dual('pc_e_breaker') });
    }
    if (kwh > 0) {
      precautions.push({ icon: '\u{1F527}', text: dual('pc_e_phantom') });
      precautions.push({ icon: '\u{1F4DD}', text: dual('pc_e_meter') });
    } else {
      precautions.push({ icon: '\u{1F331}', text: dual('pc_e_zero') });
    }

    const reduce = [
      { icon: '\u{1F4A1}', text: dual('rd_e1') }, { icon: '\u{1F32C}', text: dual('rd_e2') },
      { icon: '\u{1F454}', text: dual('rd_e3') }, { icon: '\u{1F506}', text: dual('rd_e4') },
      { icon: '\u{1F6AA}', text: dual('rd_e5') }, { icon: '\u{1F9FA}', text: dual('rd_e6') },
      { icon: '\u{1F333}', text: dual('rd_offset', Math.max(1, Math.ceil(total * 365 / 21))) },
    ];

    return { total, comparisons, meta, savings, precautions, reduce,
             title: T.report_e, subtitle: T.sub_e(kwh.toFixed(1)) };
  }

  function wasteReport(bioKg, nonbioKg) {
    const bioCO2 = bioKg * FACTORS.waste.bio;
    const nonbioCO2 = nonbioKg * FACTORS.waste.nonbio;
    const total = bioCO2 + nonbioCO2;
    const totalKg = bioKg + nonbioKg;

    const comparisons = [
      { label: T.cmp_bio,    value: +bioCO2.toFixed(2) },
      { label: T.cmp_nonbio, value: +nonbioCO2.toFixed(2) },
    ];

    const meta = [
      { label: T.meta_bio,        value: bioKg.toFixed(2) + ' kg' },
      { label: T.meta_nonbio,     value: nonbioKg.toFixed(2) + ' kg' },
      { label: T.meta_total_w,    value: totalKg.toFixed(2) + ' kg' },
      { label: T.meta_bio_co2,    value: bioCO2.toFixed(2) + ' kg' },
      { label: T.meta_nonbio_co2, value: nonbioCO2.toFixed(2) + ' kg' },
      { label: T.meta_trees,      value: Math.max(1, Math.ceil(total * 365 / 21)).toString() },
    ];

    const savings = [];
    if (bioKg > 0) {
      savings.push({ icon: '\u267B', text: dual('sv_compost', bioCO2.toFixed(2)) });
    }
    if (nonbioKg > 0) {
      const recycleSave = +(nonbioKg * 0.6 * FACTORS.waste.nonbio).toFixed(2);
      savings.push({ icon: '\u{1F4F1}', text: dual('sv_recycle', recycleSave) });
      savings.push({ icon: '\u{1F36F}', text: dual('sv_bulk') });
    }
    if (bioKg + nonbioKg > 0) {
      savings.push({ icon: '\u{1F455}', text: dual('sv_donate') });
    } else {
      savings.push({ icon: '\u2728', text: dual('sv_waste_hint') });
    }

    const precautions = [
      { icon: '\u{1F9E4}', text: dual('pc_w_gloves') },
      { icon: '\u{1F9EA}', text: dual('pc_w_haz') },
      { icon: '\u{1F5D1}', text: dual('pc_w_separate') },
    ];
    if (nonbioKg > 0) precautions.push({ icon: '\u{1F525}', text: dual('pc_w_burn') });
    if (totalKg > 2) {
      precautions.push({ icon: '\u{1F4E6}', text: dual('pc_w_seal') });
      precautions.push({ icon: '\u{1F69B}', text: dual('pc_w_quick') });
    }

    const reduce = [
      { icon: '\u{1F37C}', text: dual('rd_w1') }, { icon: '\u{1F6AB}', text: dual('rd_w2') },
      { icon: '\u267B', text: dual('rd_w3') },     { icon: '\u{1F527}', text: dual('rd_w4') },
      { icon: '\u{1F381}', text: dual('rd_w5') }, { icon: '\u{1F5C2}', text: dual('rd_w6') },
      { icon: '\u{1F333}', text: dual('rd_offset', Math.max(1, Math.ceil(total * 365 / 21))) },
    ];

    return { total, comparisons, meta, savings, precautions, reduce,
             title: T.report_w, subtitle: T.sub_w(bioKg.toFixed(2), nonbioKg.toFixed(2)) };
  }

  // Pollution-impact powerful recommendations
  function buildPowerful(cat, total) {
    const tier = pollutionTier(total, cat);
    const tagKey = (tier === 'low' || tier === 'na') ? 'pw_tag_low'
                 : tier === 'mid' ? 'pw_tag_mid'
                 : tier === 'high' ? 'pw_tag_high'
                 : 'pw_tag_very';
    const introKey = (tier === 'low' || tier === 'na') ? 'pw_intro_low'
                   : tier === 'mid' ? 'pw_intro_mid'
                   : tier === 'high' ? 'pw_intro_high'
                   : 'pw_intro_very';

    const tag = dual(tagKey);
    const intro = dual(introKey, total.toFixed(2));

    // pollution-context equivalents (always shown)
    const km   = +(total / FACTORS.transport.car).toFixed(1);
    const phones = Math.round(total / 0.005);
    const trees = Math.max(1, Math.ceil(total * 365 / 21));

    const tips = [
      { icon: '\u{1F30D}', text: intro },
      { icon: '\u{1F4CF}', text: dual('pw_eq_drive', km) },
      { icon: '\u{1F50B}', text: dual('pw_eq_phones', phones) },
      { icon: '\u{1F333}', text: dual('pw_eq_trees', trees) },
      { icon: '\u{1F32B}', text: dual('pw_eq_aqi') },
    ];

    // Category-specific high-impact actions; intensify with tier
    const heavy = (tier === 'high' || tier === 'very');
    if (cat === 'transport') {
      if (heavy) {
        tips.push({ icon: '\u{1F69C}', text: dual('pw_t_high1') });
        tips.push({ icon: '\u{1F4BB}', text: dual('pw_t_high2') });
        tips.push({ icon: '\u26FD',     text: dual('pw_t_high3') });
        tips.push({ icon: '\u{1F50B}', text: dual('pw_t_high4') });
      } else {
        tips.push({ icon: '\u{1F31F}', text: dual('pw_t_low1') });
      }
    } else if (cat === 'energy') {
      if (heavy) {
        tips.push({ icon: '\u2600',     text: dual('pw_e_high1') });
        tips.push({ icon: '\u{1F31E}', text: dual('pw_e_high2') });
        tips.push({ icon: '\u2744',     text: dual('pw_e_high3') });
        tips.push({ icon: '\u2B50',     text: dual('pw_e_high4') });
      } else {
        tips.push({ icon: '\u{1F4A1}', text: dual('pw_e_low1') });
      }
    } else if (cat === 'waste') {
      if (heavy) {
        tips.push({ icon: '\u{1F95C}', text: dual('pw_w_high1') });
        tips.push({ icon: '\u267B',     text: dual('pw_w_high2') });
        tips.push({ icon: '\u{1F4F1}', text: dual('pw_w_high3') });
        tips.push({ icon: '\u{1F6CD}', text: dual('pw_w_high4') });
      } else {
        tips.push({ icon: '\u267B', text: dual('pw_w_low1') });
      }
    }

    return { tag, intro, tips, tier };
  }

  function buildReport(cat, fd) {
    if (cat === 'transport') return transportReport(Number(fd.get('transport_km') || 0), fd.get('transport_mode') || 'car');
    if (cat === 'energy')    return energyReport(Number(fd.get('energy_kwh') || 0));
    return wasteReport(Number(fd.get('bio_kg') || 0), Number(fd.get('nonbio_kg') || 0));
  }

  function showReport(cat, report) {
    document.getElementById('reportTitle').textContent = report.title;
    document.getElementById('reportSubtitle').textContent = report.subtitle;
    document.getElementById('rTotal').textContent = report.total.toFixed(2);
    setImpact(report.total, cat);
    renderMeta(report.meta);
    renderTipList('reportSavings', report.savings);
    renderTipList('reportPrecautions', report.precautions);
    renderTipList('reportReduce', report.reduce);
    drawChart(cat, +report.total.toFixed(2), report.comparisons);

    const pw = buildPowerful(cat, report.total);
    const badge = document.getElementById('powerfulBadge');
    badge.textContent = pw.tag;
    badge.className = 'powerful-badge tier-' + pw.tier;
    document.getElementById('powerfulIntro').textContent = pw.intro;
    renderTipList('reportPowerful', pw.tips);
  }

  function resetReport() {
    document.getElementById('reportTitle').textContent = I['calc.your_report'] || 'Your report';
    document.getElementById('reportSubtitle').textContent = I['calc.pick_press'] || '';
    document.getElementById('rTotal').textContent = '0.00';
    setImpact(0, selectedCat());
    document.getElementById('reportMeta').innerHTML = '';
    document.getElementById('reportSavings').innerHTML = '';
    const runMsg = I['calc.run_first'] || 'Run a calculation.';
    document.getElementById('reportPrecautions').innerHTML =
      '<li><span class="tip-icon">\u2728</span><span>' + escapeHtml(runMsg) + '</span></li>';
    document.getElementById('reportReduce').innerHTML =
      '<li><span class="tip-icon">\u{1F331}</span><span>' + escapeHtml(runMsg) + '</span></li>';
    document.getElementById('reportPowerful').innerHTML = '';
    document.getElementById('powerfulIntro').textContent = runMsg;
    const badge = document.getElementById('powerfulBadge');
    badge.textContent = '\u2014';
    badge.className = 'powerful-badge';
    chart && chart.destroy(); chart = null;
  }

  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const cat = selectedCat();
      const fd = new FormData(form);
      const report = buildReport(cat, fd);

      // Persist to backend (always send all fields; only the chosen cat has data)
      const body = {
        transport_mode: fd.get('transport_mode') || 'car',
        transport_km: cat === 'transport' ? Number(fd.get('transport_km') || 0) : 0,
        energy_kwh:   cat === 'energy'    ? Number(fd.get('energy_kwh') || 0)   : 0,
        bio_kg:       cat === 'waste'     ? Number(fd.get('bio_kg') || 0)       : 0,
        nonbio_kg:    cat === 'waste'     ? Number(fd.get('nonbio_kg') || 0)    : 0,
      };
      try {
      const res = await E.postJSON('/api/calculate', body);
      console.log("Saved:", res);

if (!res || res.error || res.saved === false) {
  console.error("Save failed:", res);
  alert("Data is not being saved 😢");
  return;
}
} catch (e) {
  alert("Data is not being saved 😢");
  console.error(e);
}
      showReport(cat, report);
    });
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => { form.reset(); resetReport(); });

  resetReport();
})();
