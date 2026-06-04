-- Insert new sage: Rabbi Yosef ben Yehuda Ibn Simeon
INSERT INTO sages (
  id, name_he, name_en, label, era, period, period_order,
  region, primary_field, core_concept, bio, tags, coordinates, migration_path
) VALUES (
  324,
  'רבי יוסף בן יהודה אבן שמעון',
  'Rabbi Yosef ben Yehuda Ibn Simeon',
  'רבי יוסף בן יהודה אבן שמעון',
  'rishonim',
  '12th century',
  5,
  'מצרים, סוריה (חלב)',
  'Philosophy, Theology',
  'תלמיד הרמב״ם וחלוץ הפילוסופיה היהודית - מתווך בין רציונליזם מערבי למסורת דתית',
  'רבי יוסף בן יהודה אבן שמעון (c. 1160–?) היה הפילוסוף היהודי הצפון אפריקאי החשוב ביותר ותלמידו הנלהב של הרמב״ם. נולד בסאוטה תחת רדיפות המואחידון, הפך למנהיג קהילת חלב (אלכסנדריתא) וללוחם הנמרץ להפצת הגישה המיימוניסטית ברחבי בבל וסוריה. יצירתו המטאפיזית ודיונו עם הרמב״ם על טבע האל והקיום עיצבו את דמות היהדות המימוני-רציונלית לדורות.',
  '["philosophy", "theology", "maimonidean", "medieval", "rishonim"]'::jsonb,
  '{"birth": {"city": "Ceuta", "region": "Morocco", "lat": 35.8883, "lng": -5.3104}, "primary_center": {"city": "Aleppo", "region": "Syria", "lat": 36.2021, "lng": 37.167}, "study_center": {"city": "Cairo", "region": "Egypt", "lat": 30.0444, "lng": 31.2357}}'::jsonb,
  '{"from": "Ceuta (Morocco)", "to": "Aleppo (Syria)", "intermediate": ["Egypt (Cairo)"], "description": "Fled Almohad persecution from Ceuta to Egypt where he studied with Maimonides; later established community leadership in Aleppo"}'::jsonb
);

-- Insert connections
INSERT INTO connections (source_id, target_id, connection_type, description) VALUES
  (324, 16, 'student', 'Direct disciple and intellectual partner of Maimonides; correspondence shaped the Guide for the Perplexed'),
  (324, 19, 'colleague', 'Contemporary philosopher; both worked on Maimonidean interpretation');