# Translation conventions (en / ru) — read me after a context reset

Workflow (no API): `python3 tx_prepare.py <id>` prints the Hebrew units `N|text` (+ `names:` hints from the site's own
i18n overlay labels). I write `tx/<id>.en.txt` and `tx/<id>.ru.txt`, one `N|translation` line per unit, in a Bash heredoc
(quoted 'EOF', `>>` to append long ones in parts). `python3 tx_build.py <id> [en|ru]` validates and writes
`nextjs-app/public/research/<id>.<lang>.json` (title translated, source_file kept, word_count recomputed; verbatim lines
= URLs/source entries/no-Hebrew lines are copied by the script; units marked "(ru only)" are Latin prose, English copies it).
Every unit once, in one line, keep `[1, 2]` / `[cite: 1]` markers and every number; table rows keep their ` | `;
headings stay short lines without final period. Quizzes: tx_quiz.py (see it).

Register: academic, faithful, no additions/omissions. Translate Hebrew quotations; transliterate the famous slogan once
in parentheses only when the paper discusses the wording itself.

## English
Rabbi/Rabban + transliteration: Yochanan, Yehoshua, Eliezer, Elazar, Akiva, Meir, Gamliel, Shimon, Yosef, Yehuda, Hillel,
Shammai, Beit Hillel / Beit Shammai ("the House of Hillel"), Ribaz = Rabban Yochanan ben Zakkai.
Rambam = Maimonides (Rambam); Ramban = Nahmanides (Ramban); Rashi; Rashba; Ritva; Ran; Rema (R. Moses Isserles);
Maharal of Prague; Shulchan Arukh; Mishneh Torah; Guide of the Perplexed; Avot de-Rabbi Natan; Pirkei Avot (Ethics of the Fathers).
Tannaim, Amoraim, Geonim, Rishonim, Acharonim; halakha; aggadah; Mishnah; Tosefta; Babylonian Talmud (Bavli), Jerusalem Talmud
(Yerushalmi); Midrash; Torah (Written / Oral Torah); yeshiva; beit midrash (study hall); Sanhedrin; beit din (rabbinic court);
Kabbalah; Hasidism; Rebbe; mussar; responsa; Tosafot; the Temple / the Second Temple; Eretz Israel = the Land of Israel.
Book titles: transliterate + gloss on first mention. Sage's own name: use the form in the site overlay when it exists.

## Russian
Раббан Йоханан бен Заккай; рабби Элиэзер бен Гиркан; рабби Йехошуа бен Хананья; рабби Акива; рабби Меир; Гилель Старший;
Шаммай Старший; дом Гилеля / дом Шаммая; Рамбам (Маймонид); Рамбан (Нахманид); Раши; Рашба; Ритва; Ран; Рема (рабби Моше Иссерлес);
Махараль из Праги; Шулхан арух; Мишне Тора; Путеводитель растерянных; Авот де-рабби Натан; Пиркей Авот (Поучения отцов).
таннаи, амораи, гаоны, ришоним, ахроним; галаха; агада; Мишна; Тосефта; Вавилонский / Иерусалимский Талмуд; мидраш; Тора
(Письменная / Устная); ешива; бейт-мидраш; Синедрин; бейт-дин (раввинский суд); каббала; хасидизм; ребе; мусар; респонсы;
тосафот; Храм / Второй Храм; Эрец-Исраэль (Земля Израиля). Use the overlay spelling (e.g. Мирьям-пророчица, Има Шалом).

## Names fixed by agents so far (reuse them)
Doña Gracia Nasi / Дона Грация Наси; Don Joseph Nasi / Дон Йосеф Наси; Maharival / Махариваль; Maharashdam / Махаршадам;
Sarah Schenirer / Сара Шенирер; Beit Yaakov / «Бейт Яаков»; Nechama Leibowitz / Нехама Лейбович; "Gilyonot" / «гильонот».
