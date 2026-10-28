import assert from "node:assert/strict";
import {
  generateItineraryDraft,
  getTripNightCount,
  ItineraryGeneratorInputError,
  type ItineraryGeneratorInput,
} from "../services/itineraryGenerator.js";

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SCHEMA_CATEGORIES = new Set([
  "food",
  "transport",
  "activity",
  "lodging",
  "other",
]);

let passed = 0;
const failures: string[] = [];

function test(name: string, run: () => void): void {
  try {
    run();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    const detail =
      error instanceof Error ? error.stack ?? error.message : String(error);
    failures.push(`${name}\n${detail}`);
    console.error(`FAIL: ${name}`);
    console.error(detail);
  }
}

function expectThrows(run: () => unknown, expectedMessagePart: string): void {
  let caught: unknown;

  try {
    run();
  } catch (error) {
    caught = error;
  }

  if (!(caught instanceof Error)) {
    assert.fail(
      `Expected an error containing "${expectedMessagePart}", but no error was thrown.`
    );
  }

  assert.ok(
    caught.message.includes(expectedMessagePart),
    `Expected error containing "${expectedMessagePart}", got "${caught.message}".`
  );
}

function makeInput(
  overrides: Partial<ItineraryGeneratorInput> = {}
): ItineraryGeneratorInput {
  return {
    destinationName: "Goa",
    startDate: "2030-02-05",
    endDate: "2030-02-08",
    travelers: 2,
    budget: 10000,
    averageCostPerDay: 2500,
    ...overrides,
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

test("duration: February 5 to February 8 produces 3 nights", () => {
  assert.equal(getTripNightCount("2030-02-05", "2030-02-08"), 3);
});

test("duration: a one-night trip produces exactly one day block", () => {
  assert.equal(getTripNightCount("2030-02-05", "2030-02-06"), 1);

  const draft = generateItineraryDraft(
    makeInput({ startDate: "2030-02-05", endDate: "2030-02-06" })
  );

  assert.equal(draft.durationDays, 1);
  assert.deepStrictEqual(
    draft.dayPlans.map((day) => day.dayIndex),
    [1]
  );
  assert.equal(draft.days.length, 2);
});

test("duration: exactly 30 nights is accepted", () => {
  assert.equal(getTripNightCount("2030-01-01", "2030-01-31"), 30);

  const draft = generateItineraryDraft(
    makeInput({ startDate: "2030-01-01", endDate: "2030-01-31" })
  );

  assert.equal(draft.durationDays, 30);
  assert.equal(draft.days.length, 60);
});

test("duration: 31 nights is rejected", () => {
  assert.equal(getTripNightCount("2030-01-01", "2030-02-01"), 31);

  expectThrows(
    () =>
      generateItineraryDraft(
        makeInput({ startDate: "2030-01-01", endDate: "2030-02-01" })
      ),
    "maximum supported duration of 30 nights"
  );
});

test("dates: invalid dates are rejected", () => {
  expectThrows(
    () => getTripNightCount("not-a-date", "2030-02-08"),
    "invalid dates"
  );
  expectThrows(
    () => generateItineraryDraft(makeInput({ startDate: "not-a-date" })),
    "invalid dates"
  );
});

test("dates: same-day trips are rejected", () => {
  expectThrows(
    () => getTripNightCount("2030-02-05", "2030-02-05"),
    "at least one night"
  );
  expectThrows(
    () =>
      generateItineraryDraft(
        makeInput({ startDate: "2030-02-05", endDate: "2030-02-05" })
      ),
    "at least one night"
  );
});

test("dates: reversed dates are rejected", () => {
  expectThrows(
    () => getTripNightCount("2030-02-08", "2030-02-05"),
    "end date must be after start date"
  );
  expectThrows(
    () =>
      generateItineraryDraft(
        makeInput({ startDate: "2030-02-08", endDate: "2030-02-05" })
      ),
    "end date must be after start date"
  );
});

test("budget: rejects 0, negative, NaN, Infinity, missing, and string values", () => {
  const invalidValues: unknown[] = [
    0,
    -100,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "5000",
  ];

  for (const value of invalidValues) {
    expectThrows(
      () =>
        generateItineraryDraft({
          ...makeInput(),
          budget: value as number,
        }),
      "Trip budget must be a finite number of at least 1"
    );
  }

  const missingBudget = {
    destinationName: "Goa",
    startDate: "2030-02-05",
    endDate: "2030-02-08",
    travelers: 2,
  } as unknown as ItineraryGeneratorInput;

  expectThrows(
    () => generateItineraryDraft(missingBudget),
    "Trip budget must be a finite number of at least 1"
  );
});

test("budget: 1 is accepted for a valid trip", () => {
  const draft = generateItineraryDraft(makeInput({ budget: 1 }));

  assert.equal(draft.durationDays, 3);
  assert.equal(draft.dailyBudget, 0);
  assert.equal(draft.estimatedTotalCost, 0);
  assert.ok(draft.days.every((activity) => activity.estimatedCost === 0));
});

test("budget ceiling: three nights with budget 1000 does not exceed 1000", () => {
  const draft = generateItineraryDraft(
    makeInput({ startDate: "2030-02-05", endDate: "2030-02-08", budget: 1000 })
  );

  assert.ok(draft.estimatedTotalCost <= 1000);
  assert.equal(
    draft.estimatedTotalCost,
    draft.days.reduce((total, activity) => total + activity.estimatedCost, 0)
  );
});

test("budget ceiling: 30 nights with budget 1 estimates 0", () => {
  const draft = generateItineraryDraft(
    makeInput({ startDate: "2030-01-01", endDate: "2030-01-31", budget: 1 })
  );

  assert.equal(draft.durationDays, 30);
  assert.equal(draft.dailyBudget, 0);
  assert.equal(draft.estimatedTotalCost, 0);
  assert.ok(draft.days.every((activity) => activity.estimatedCost === 0));
});

test("structure: draft matches schema and slot rules", () => {
  const draft = generateItineraryDraft(makeInput());

  assert.equal(draft.saved, false);
  assert.equal(draft.generatedBy, "rule-based");
  assert.equal(draft.durationDays, 3);
  assert.equal(draft.dayPlans.length, 3);
  assert.equal(draft.days.length, 6);

  assert.deepStrictEqual(
    draft.dayPlans.flatMap((day) => day.activities),
    draft.days
  );

  for (const day of draft.dayPlans) {
    assert.ok(Number.isInteger(day.dayIndex));
    assert.ok(day.dayIndex >= 1 && day.dayIndex <= draft.durationDays);
    assert.equal(day.activities.length, 2);

    for (const activity of day.activities) {
      assert.equal(activity.dayIndex, day.dayIndex);
      assert.ok(
        activity.title.startsWith("Sample:") || activity.source === "curated"
      );
      assert.ok(activity.title.length > 0);
      assert.ok(
        activity.notes.includes("Not a verified real-world recommendation") ||
          activity.notes.includes("Curated estimate only")
      );
      assert.ok(activity.locationName.trim().length > 0);
      assert.ok(SCHEMA_CATEGORIES.has(activity.category));
      assert.match(activity.startTime, HH_MM_PATTERN);
      assert.match(activity.endTime, HH_MM_PATTERN);
      assert.ok(
        timeToMinutes(activity.endTime) > timeToMinutes(activity.startTime)
      );
      assert.ok(Number.isFinite(activity.estimatedCost));
      assert.ok(activity.estimatedCost >= 0);
      assert.equal(typeof activity.description, "string");
      assert.ok(activity.description.trim().length > 0);
    }

    const sorted = [...day.activities].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    for (let index = 1; index < sorted.length; index += 1) {
      assert.ok(
        timeToMinutes(sorted[index].startTime) >=
          timeToMinutes(sorted[index - 1].endTime)
      );
    }
  }
});

test("determinism: identical input produces deeply equal drafts", () => {
  assert.deepStrictEqual(
    generateItineraryDraft(makeInput()),
    generateItineraryDraft(makeInput())
  );
});

test("travelers: rejects 0, negative, fractional, above 50, NaN, Infinity, and string", () => {
  const invalidValues: unknown[] = [
    0,
    -1,
    1.5,
    51,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "2",
  ];

  for (const value of invalidValues) {
    expectThrows(
      () =>
        generateItineraryDraft({
          ...makeInput(),
          travelers: value as number,
        }),
      "Travelers must be a whole number between 1 and 50"
    );
  }
});

test("travelers: accepts 1 and 50", () => {
  assert.doesNotThrow(() =>
    generateItineraryDraft(makeInput({ travelers: 1 }))
  );
  assert.doesNotThrow(() =>
    generateItineraryDraft(makeInput({ travelers: 50 }))
  );
});

test("warning: finite reference cost above daily budget produces a warning", () => {
  const draft = generateItineraryDraft(
    makeInput({ budget: 1000, travelers: 2, averageCostPerDay: 2500 })
  );

  assert.equal(draft.dailyBudget, 333);
  assert.equal(typeof draft.budgetWarning, "string");
  assert.ok(draft.budgetWarning?.includes("below the destination average"));
  assert.ok(!draft.budgetWarning?.includes("Infinity"));
  assert.ok(!draft.budgetWarning?.includes("NaN"));
});

test("warning: finite reference cost below daily budget produces no warning", () => {
  const draft = generateItineraryDraft(
    makeInput({ budget: 10000, travelers: 1, averageCostPerDay: 10 })
  );

  assert.equal(draft.budgetWarning, undefined);
});

test("warning: overflowing multiplication omits Infinity and NaN", () => {
  const draft = generateItineraryDraft(
    makeInput({
      budget: 10000,
      travelers: 50,
      averageCostPerDay: Number.MAX_VALUE,
    })
  );

  assert.equal(draft.budgetWarning, undefined);
});

test("warning: missing optional average cost does not break generation", () => {
  const input: ItineraryGeneratorInput = {
    destinationName: "Goa",
    startDate: "2030-02-05",
    endDate: "2030-02-08",
    travelers: 2,
    budget: 10000,
  };

  const draft = generateItineraryDraft(input);

  assert.equal(draft.durationDays, 3);
  assert.equal(draft.days.length, 6);
  assert.equal(draft.budgetWarning, undefined);
});

test("preferences: destination and interests change selected activities", () => {
  const natureDraft = generateItineraryDraft(
    makeInput({
      preferences: { interests: ["nature"], pace: "balanced" },
    })
  );
  const foodDraft = generateItineraryDraft(
    makeInput({
      preferences: { interests: ["food"], pace: "balanced" },
    })
  );

  assert.notDeepEqual(
    natureDraft.days.map((activity) => activity.title),
    foodDraft.days.map((activity) => activity.title)
  );
  assert.ok(natureDraft.days.some((activity) => activity.title.includes("Coastal")));
  assert.ok(foodDraft.days.some((activity) => activity.category === "food"));
});

test("preferences: relaxed and packed pace change daily activity counts", () => {
  const relaxed = generateItineraryDraft(
    makeInput({ preferences: { interests: ["sightseeing"], pace: "relaxed" } })
  );
  const packed = generateItineraryDraft(
    makeInput({ preferences: { interests: ["sightseeing"], pace: "packed" } })
  );

  assert.ok(relaxed.dayPlans.every((day) => day.activities.length <= 1));
  assert.ok(packed.dayPlans.some((day) => day.activities.length > 1));
});

test("preferences: daily budget skips unaffordable paid activities", () => {
  const draft = generateItineraryDraft(
    makeInput({
      budget: 3000,
      preferences: {
        interests: ["food", "adventure"],
        pace: "balanced",
        dailyBudget: 0,
      },
    })
  );

  assert.ok(draft.days.every((activity) => activity.estimatedCost === 0));
});

test("preferences: generated schedules do not overlap", () => {
  const draft = generateItineraryDraft(
    makeInput({ preferences: { interests: ["nature"], pace: "packed" } })
  );

  for (const day of draft.dayPlans) {
    const times = day.activities
      .map((activity) => ({
        start: timeToMinutes(activity.startTime),
        end: timeToMinutes(activity.endTime),
      }))
      .sort((left, right) => left.start - right.start);
    for (let index = 1; index < times.length; index += 1) {
      assert.ok(times[index].start >= times[index - 1].end);
    }
  }
});

test("preferences: invalid values are rejected by the generator", () => {
  assert.throws(
    () =>
      generateItineraryDraft(
        makeInput({
          preferences: {
            interests: ["invalid" as never],
            pace: "balanced",
          },
        })
      ),
    ItineraryGeneratorInputError
  );
  assert.throws(
    () =>
      generateItineraryDraft(
        makeInput({
          preferences: {
            interests: ["nature"],
            pace: "balanced",
            dailyBudget: 5000,
          },
        })
      ),
    ItineraryGeneratorInputError
  );
});

test("hybrid data: mapped attractions and curated experiences are combined without early repeats", () => {
  const draft = generateItineraryDraft(
    makeInput({
      destinationName: "Jaipur",
      preferences: { interests: ["culture", "sightseeing"], pace: "balanced" },
      attractions: [
        {
          id: "amber-fort",
          name: "Amber Fort",
          category: "culture",
          locality: "Jaipur",
          source: "openstreetmap",
          sourceLabel: "OpenStreetMap contributors",
          estimatedDurationMinutes: 150,
        },
        {
          id: "hawa-mahal",
          name: "Hawa Mahal",
          category: "culture",
          locality: "Jaipur",
          source: "openstreetmap",
          sourceLabel: "OpenStreetMap contributors",
          estimatedDurationMinutes: 90,
        },
      ],
    })
  );

  const titles = draft.days.map((activity) => activity.title);
  assert.ok(titles.includes("Amber Fort"));
  assert.ok(titles.includes("Hawa Mahal"));
  assert.equal(new Set(titles).size, titles.length);
  assert.ok(draft.days.some((activity) => activity.source === "openstreetmap"));
  assert.ok(draft.days.some((activity) => activity.source === "curated"));
});

test("errors: validation failures use ItineraryGeneratorInputError", () => {
  assert.throws(
    () => generateItineraryDraft(makeInput({ budget: 0 })),
    ItineraryGeneratorInputError
  );
  assert.throws(
    () => getTripNightCount("2030-02-05", "2030-02-05"),
    ItineraryGeneratorInputError
  );
});

console.log(`\nSummary: ${passed} passed, ${failures.length} failed.`);

if (failures.length > 0) {
  process.exitCode = 1;
}
