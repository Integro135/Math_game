# מבנה בדיקות — `tests/`

חבילת ה־pytest + Playwright של המשחק. עד יולי 2026 כל הבדיקות ישבו בקובץ יחיד
ענק (`test_game.py`, ‎5,641 שורות); הן פוצלו לפי קטגוריה לקבצים קטנים ומסודרים
תחת התיקייה הזו. **מספר הבדיקות זהה לחלוטין (284)** — רק הארגון השתנה.

הבדיקות רצות מול `index.html` (file://) בדפדפן Chrome אמיתי ללא ראש (headless).

## הרצה

```powershell
# כל החבילה (headless, ~כמה דקות)
py -m pytest tests

# קובץ קטגוריה בודד
py -m pytest tests/test_columns.py

# מחלקה / בדיקה בודדת
py -m pytest tests/test_champion.py::TestPerimeter
py -m pytest tests/test_scoring.py::TestScoreAndMode::test_score_starts_at_zero

# חלון Chrome נראה (לצפייה)
set HEADED=1 && py -m pytest tests
# נראה + מואט כדי לעקוב אחרי כל פעולה
set HEADED=1 && set SLOW_MO=600 && py -m pytest tests
```

## תשתית משותפת (לא קבצי בדיקה)

| קובץ | תפקיד |
|------|-------|
| `helpers.py`  | הקבועים `GAME_URL` / `CHROME_EXE` / `TIMEOUT` + כל פונקציות העזר המשותפות (`get_state`, `correct_answer`, `submit_answer`, `wait_fw_and_advance`, `reveal_aids`, `solve_one`, `play_n_correctly`, `open_report`, `open_settings_via_gate`). כל קובץ בדיקה עושה `from helpers import *`. |
| `conftest.py` | נטען אוטומטית ע"י pytest. מכיל את ה־fixtures `browser_instance` (דפדפן יחיד לכל הריצה, מחומם) ו־`page` (context+page טרי לכל בדיקה, splash כבוי), וכן את תוסף הדיווח `_ReportPlugin` (לוג חי per-test + סיכום "SUBTRACTION GAME -- TEST RESULTS" בסוף). |

> אין `__init__.py` בכוונה — pytest במצב ייבוא "prepend" מוסיף את `tests/` ל־`sys.path`,
> כך ש־`from helpers import *` וייבוא ה־fixtures מ־`conftest` עובדים ישירות.
>
> תוסף הדיווח מקבץ תוצאות לפי שם המחלקה (מתוך ה־nodeid) דרך המילון `_CLASS_LABELS`,
> ולכן העברת מחלקה לקובץ אחר אינה משנה את הסיכום. תיאור אנושי לכל בדיקה נשמר במילון
> `_DESC`. שני המילונים חיים ב־`conftest.py`.

## קבצי הקטגוריות

| קובץ | # | מכסה (מחלקות) | נושא |
|------|---|----------------|------|
| `test_report.py`          | 5  | `TestReport` | דוח סוף־משחק (וי/איקס/דילוג, ציון) |
| `test_double_unknown.py`  | 15 | `TestDoubleUnknown` | תרגילי X+X / X−X (שני נעלמים, מיקומים 4/8/12) |
| `test_scoring.py`         | 19 | `TestScoreAndMode`, `TestTryFirstScoring` | ניקוד, בחירת רמה, וניקוד "נסה קודם" |
| `test_game_flow.py`       | 7  | `TestGameFlow` | זרימת משחק כללית (12 שאלות, פס התקדמות, restart) |
| `test_coins.py`           | 13 | `TestCoinProblems`, `TestChainAndCoinAids` | ספירת מטבעות + עזרי שרשרת/מטבעות |
| `test_number_line.py`     | 9  | `TestNumberLineVisibility`, `TestNumberLineInteraction` | הופעת/אינטראקציית ישר המספרים (`#nl-panel`) |
| `test_tens.py`            | 4  | `TestTensProblems` | תרגילי עשרות עגולות (TT) — מלך & מלכה |
| `test_tooltips.py`        | 20 | `TestNumberHoverTooltip`, `TestBridgeSplitTooltip` | tooltips של אובייקטים + פיצול קשר־עשר בריחוף |
| `test_bridging.py`        | 38 | `TestBridgingMode`, `TestBridge20` | גשר 10 🌈 וגשר 20 🌉 |
| `test_var_unknown.py`     | 10 | `TestVarOneUnknown` | נעלם־צורה יחיד (⃝ = N, אח"כ a ± ⃝ = ?) |
| `test_dynamic.py`         | 9  | `TestDynamicExercises` | טעינה דינמית של `exercises/*.ex.js` |
| `test_big_step.py`        | 6  | `TestBigStepMode` | מספרים גדולים ±1/2 (עַד 100 / TBG) |
| `test_columns.py`         | 35 | `TestSupermanColumnAdd`, `TestSupermanDigitPreview`, `TestColumnSubtraction` | חיבור/חיסור בטור + תצוגת ספרות |
| `test_superman.py`        | 19 | `TestCoinMul`, `TestBagelCost` | תרגילי סופרמן — כפל מטבעות ועלות בייגלה |
| `test_aids.py`            | 5  | `TestJarStageDisplay`, `TestAidToggleIcons` | מודול צנצנת השלב + אייקוני עזר קבועים |
| `test_ui.py`             | 2  | `TestAnswerBorders` | חוזה מסגרת ירוקה/אדומה של תיבת התשובה |
| `test_settings.py`        | 17 | `TestSettingsModalFlow`, `TestSettingsTabs`, `TestModePersistence`, `TestScoreHistory` | מודל ההגדרות, לשוניות, persistence, היסטוריית ציונים |
| `test_gifts.py`           | 12 | `TestGiftReward`, `TestPrizeConfig` | פרסי 🎁 — זכאות, מסך מתנה, קונפיג לכל משחק |
| `test_success_screens.py` | 8  | `TestPraiseText`, `TestSuccessDuration` | מסכי ההצלחה — טקסט שבח + משך תצוגה |
| `test_champion.py`        | 31 | `TestChampMultiplication`, `TestPerimeter`, `TestCompare`, `TestStagedColumnSub`, `TestTripleSum` | קטגוריית אַלּוּפָה 🏆 (הרמה הקשה) — כל תרגילי ה־mulc + פונקציות העזר הייעודיות שלהם |
|  | **284** | | |

`test_champion.py` הוא בלוק רציף אחד: הוא כולל את חמש מחלקות אַלּוּפָה יחד עם תשע
פונקציות העזר הצמודות שלהן (`_enter_mulc`, `_enter_perim`, `_dispatch_enter`,
`_enter_compare`, `_drag_sign`, `_enter_staged_sub`, `_solve_column_87_23`,
`_enter_triple`, `_triple_submit`) — הן משותפות בין המחלקות בקובץ הזה בלבד.
