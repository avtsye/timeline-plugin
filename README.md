# Otzaria Timeline

תוסף ציר זמן מקומי לאוצריא.

## גרסה 0.13.0

הגרסה הזו משלימה מעבר של **כל שכבת התוכן** למראה והתנהגות של רכיבי Otzaria עצמם — לא רק תפריטים וניווט.

### רכיבי אוצריא שיושמו

העיצוב מבוסס ישירות על הרכיבים וה־tokens הרשמיים של אוצריא:

- `AppTokens`
  - רווחים 4 / 8 / 16 / 24 / 32
  - radius אחיד של 8px
  - סקלת טיפוגרפיה 12 / 14 / 16 / 18
- `AppInputTokens`
  - 36px compact / 48px regular
  - radius 20 / 28
  - רקעי input לפי onSurface alpha
- `ActionButton`
  - Recommended / Neutral / Ghost / Warning
- `SettingsCard`
- `SettingsActionTile`
- `CustomSwitch`
- `AppCard.section`
- `OtzariaEmptyState`
- `AppMenu`
- `RtlTextField`
- Fluent icons

### מה השתנה בפועל

- Session-ים נראים עכשיו כמו רשומות תוכנה של אוצריא ולא כמו Web Cards.
- Event rows קיבלו אייקוני Fluent לפי סוג הפעילות.
- Snapshot rows עברו למבנה ListTile.
- סטטיסטיקות ורשימות משתמשות במבנה AppCard.section עם מפרידים דקים.
- כפתורים תואמים ל־Filled / Tonal / Text של ActionButton.
- שדות החיפוש והקלט תואמים לגבהים, רדיוסים ורקעים של AppInputTokens.
- מתגים מעוצבים כמו CustomSwitch של אוצריא.
- הגדרות בנויות בסגנון SettingsCard + SettingsActionTile.
- תפריטי הקשר ותפריטי ⋯ מעוצבים כמו AppMenu.
- Dialogs פנימיים מעוצבים כמו אוצריא.
- Empty states מעוצבים כמו OtzariaEmptyState.
- scrollbars, focus states ו־hover states מותאמים לערכת הנושא.
- כל הצבעים ממשיכים להגיע מ־Theme של אוצריא.

### אין יותר חלונות דפדפן

הוסרו לחלוטין:
- `alert()`
- `prompt()`
- `confirm()`

כל בקשת שם, אישור מחיקה, ייבוא, שחזור וגיבוי משתמשת בדיאלוג פנימי של התוסף בעיצוב אוצריא.

ה־CI נכשל אם בעתיד חוזרת קריאה לאחד מהחלונות האלה.

### שאר יכולות Timeline

- ציר לפי זמן.
- Hour markers.
- Zoom.
- יום / שבוע / חודש.
- חיפוש מתקדם.
- Context menu.
- ניווט מקלדת.
- רינדור מדורג.
- Live sync עם אירועי אוצריא.
- Snapshots.
- גיבויים.
- ארכיון מתומצת.
- עברית / English.
- RTL / LTR.
- Light / Dark.
- GitHub Releases עם `.otzplugin` ישיר.

## תאימות

Otzaria 0.9.97 ומעלה, ללא שינוי בגוף התוכנה.
