# Otzaria Timeline

תוסף ציר זמן מקומי לאוצריא.

## גרסה 0.14.0

גרסה 0.14 היא גל עיצוב מבני ורוחבי שמטרתו אחת: שהתוסף ירגיש כמו **חלק מאוצריא עצמה**, ולא כמו דף Web שמוטמע בתוכה.

## מה השתנה

### שפת UI אחידה של אוצריא

הממשק מבוסס ישירות על הרכיבים וה־tokens הרשמיים של אוצריא:

- `AppTokens`
- `AppInputTokens`
- `ActionButton`
- `SettingsCard`
- `SettingsActionTile`
- `CustomSwitch`
- `AppCard.section`
- `OtzariaEmptyState`
- `AppMenu`
- `RtlTextField`
- Fluent System Icons

הרווחים, הרדיוסים, גבהי הקלט, גדלי הטקסט, hover/focus והצבעים נגזרים מהדפוסים האלה.

### ציר הזמן

- סרגל כלים צפוף בסגנון אוצריא.
- חיפוש עם Fluent Search, ניקוי מהיר ו־debounce.
- מסננים עברו ל־popover קומפקטי במקום שורת Selects של טופס.
- Zoom הוא IconButton.
- מצב פוקוס הוא IconButton.
- יום / שבוע / חודש נשארים כ־segmented control.
- סימוני שעות עדינים.
- Sessions נבנו מחדש כרשומות תוכנה ולא כ־Web cards.
- Preview הוא שורת מידע שטוחה.
- אירועים מוצגים כ־ListTile עם Fluent icon מוביל, טקסט, שעה ופעולת מועדף.
- פעולות Session נמצאות ב־AppMenu עם אייקוני Fluent.
- אין chips גדולים או כרטיסים צבעוניים בתוך הציר.

### סקירה

- “המשך עבודה” הוא ListTile עם פעולה בקצה.
- סטטיסטיקות הן שתי קבוצות רשימה צפופות.
- 35 הימים האחרונים נשאר כ־visualization.
- חיפושים אחרונים ומסננים משתמשים ברכיבי פעולה שטוחים.

### שחזור

מסך השחזור בנוי כ־SettingsActionTile/ListTile:

- שמירת נקודת שחזור.
- דפדפן נקודות שחזור.
- ייצוא.
- ייבוא.
- ארכיון מתומצת.

נקודות השחזור עצמן מוצגות כרשימת Otzaria ולא ככרטיסים.

### פעילות

לוח הפעילות אינו נפתח יותר ב־Modal.

הוא מסך מלא עם:
- גרף 30 ימים.
- 12 שבועות.
- 12 חודשים.
- Heatmap שנתי.
- Top Books.
- Top Plugins.
- Recent Places.

הרשימות הן Native rows, לא Cards.

### אבחון

גם האבחון אינו Modal עוד.

המסך מציג ישירות:
- הרשאות.
- אחסון.
- Snapshot אחרון.
- גיבויים.
- מצב מעקב.
- תוספים חסרים.
- שחזור גיבויים.

### הגדרות

- קטגוריות צדדיות כמו מסכי Settings של אוצריא.
- שורות Switch בסגנון `SettingsActionTile.switchTile`.
- המתג ממוקם כ־trailing ולא לפני הכותרת.
- לכל הגדרה Fluent icon.
- Dropdowns עטופים ב־AppDropdown עם Chevron Fluent.
- פעולות פרטיות, משוב ותחזוקה הן שורות פעולה ולא “קבוצת כפתורים”.
- מתגים מעוצבים לפי `CustomSwitch`.

### דיאלוגים ומסכי משנה

אין שימוש ב:
- `alert()`
- `prompt()`
- `confirm()`

כל הדיאלוגים פנימיים.

גם:
- היסטוריית ספר.
- Timeline של תוסף.
- כל נקודות השחזור.
- Preview שחזור.
- מיפוי pluginId.
- ארכיון מתומצת.

עברו למבנה Native list / Settings row.

### Fluent Icons

ה־bundle המקומי הורחב מ־24 ל־70 אייקוני Fluent רשמיים.

האייקונים החסרים נלקחו ישירות מ־`microsoft/fluentui-system-icons`, הומרו ל־`currentColor` ונארזו בתוך התוסף.

התוסף נשאר Offline בזמן שימוש.

### Theme

כל הצבעים מגיעים מ־ColorScheme של אוצריא:

- Primary / Secondary / Tertiary.
- כל Surface Containers.
- Error.
- Outline.
- Inverse.
- Shadow / Scrim / Surface Tint.
- Light / Dark.

הטיפוגרפיה משתמשת ב:
- `uiFontFamily`
- `fontFamily`
- `commentatorsFontFamily`
- `fontSize`
- `commentatorsFontSize`
- `lineHeight`

### QA

ה־CI בודק כעת:

- תחביר JavaScript.
- התאמת DOM לקוד.
- APIs של Otzaria 0.9.97.
- שאין Browser-native dialogs.
- שאין `miniCard` או `modalGrid`.
- שאין controls ישנים מוסתרים.
- שכל Fluent icon בשימוש אכן ארוז.
- שקיימים רכיבי ה־Native UI הקריטיים.
- תקינות חבילת `.otzplugin`.

## תאימות

- Otzaria 0.9.97 ומעלה.
- עברית / English.
- RTL / LTR.
- Light / Dark.
- ללא שינוי בגוף אוצריא.
- ללא רשת חיצונית בזמן שימוש.

## Release

כל גרסת Manifest יוצרת אוטומטית GitHub Release עם קובץ `.otzplugin` ישיר.
