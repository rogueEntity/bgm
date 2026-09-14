INSERT INTO "games" (
    "key",
    "name",
    "name_en",
    "min_players",
    "max_players",
    "is_active"
)
VALUES (
    'yacht',
    '야찌 다이스',
    'Yacht Dice',
    1,
    6,
    true
)
ON CONFLICT ("key") DO UPDATE SET
    "name" = EXCLUDED."name",
    "name_en" = EXCLUDED."name_en",
    "min_players" = EXCLUDED."min_players",
    "max_players" = EXCLUDED."max_players";
