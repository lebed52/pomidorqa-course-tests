import { test, expect } from "@playwright/test";
import {
  makeUser,
  registerUser,
  type TestUser,
} from "../helpers/user";
import {
  createApp,
  closeApps,
  type AppContext,
} from "../helpers/booking";

function makeRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function registerWithSkill(
  app: AppContext,
  user: TestUser,
  skill: string,
) {
  await test.step(
    `${user.name}: регистрируется и добавляет навык ${skill}`,
    async () => {
      await registerUser(app.page, user);

      await app.profilePage.goto();
      await app.profilePage.addSkill(skill, "can_help");
    },
  );
}

async function addFutureSlot(
  app: AppContext,
  participantName: string,
  time = "12:00",
) {
  await test.step(
    `${participantName}: добавляет будущий свободный слот`,
    async () => {
      await app.slotsPage.goto();
      await app.slotsPage.addSlot(time);
    },
  );
}

async function prepareCatalogParticipant(
  app: AppContext,
  user: TestUser,
  skill: string,
  time = "12:00",
) {
  await registerWithSkill(app, user, skill);
  await addFutureSlot(app, user.name, time);
}

test.describe("Поиск участников PomidorQA", () => {
  test(
    "гость находит участника по уникальному навыку",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("guest-search");
      const skill = `SearchQA-${runId}`;
      const host = makeUser(`host-${runId}`);

      const hostApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostApp,
          host,
          skill,
        );

        await test.step(
          "Гость: открывает каталог и ищет уникальный навык",
          async () => {
            await guestApp.bookingPage.goToCatalog();
            await guestApp.bookingPage.searchCatalog(skill);
          },
        );

        await test.step(
          "В выдаче видна карточка подготовленного участника",
          async () => {
            const hostCard =
              guestApp.bookingPage.personCard(host.name);

            await expect(hostCard).toBeVisible({
              timeout: 30_000,
            });

            await expect(hostCard).toHaveCount(1);
          },
        );
      } finally {
        await closeApps([hostApp, guestApp]);
      }
    },
  );

  test(
    "несуществующий навык возвращает пустую выдачу",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("empty-search");
      const existingSkill = `Existing-${runId}`;
      const missingSkill = `Missing-${runId}`;
      const host = makeUser(`host-${runId}`);

      const hostApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostApp,
          host,
          existingSkill,
        );

        await test.step(
          "Гость: сначала ищет существующий уникальный навык",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              existingSkill,
            );
          },
        );

        await test.step(
          "Контроль: подготовленный участник действительно доступен в каталоге",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(host.name),
            ).toBeVisible({
              timeout: 30_000,
            });
          },
        );

        await test.step(
          "Гость: ищет заведомо несуществующий навык",
          async () => {
            await guestApp.bookingPage.searchCatalog(
              missingSkill,
            );
          },
        );

        await test.step(
          "Выдача для несуществующего навыка пустая",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(host.name),
            ).toHaveCount(0);

            await expect(
              guestApp.bookingPage.personCards,
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([hostApp, guestApp]);
      }
    },
  );

  test(
    "авторизованный пользователь не видит собственную карточку, а гость видит",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("self-hidden");
      const skill = `SelfHidden-${runId}`;
      const host = makeUser(`host-${runId}`);

      const hostApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostApp,
          host,
          skill,
        );

        await test.step(
          "Гость: ищет навык подготовленного участника",
          async () => {
            await guestApp.bookingPage.goToCatalog();
            await guestApp.bookingPage.searchCatalog(skill);
          },
        );

        await test.step(
          "Контроль: гость видит карточку участника",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(host.name),
            ).toBeVisible({
              timeout: 30_000,
            });
          },
        );

        await test.step(
          "Авторизованный участник: ищет собственный уникальный навык",
          async () => {
            await hostApp.bookingPage.goToCatalog();
            await hostApp.bookingPage.searchCatalog(skill);
          },
        );

        await test.step(
          "Авторизованный участник не видит собственную карточку",
          async () => {
            await expect(
              hostApp.bookingPage.personCard(host.name),
            ).toHaveCount(0);

            await expect(
              hostApp.bookingPage.personCards,
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([hostApp, guestApp]);
      }
    },
  );

  test(
    "гость видит двух участников с одинаковым навыком",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("shared-skill");
      const sharedSkill = `SharedSkill-${runId}`;

      const hostOne = makeUser(`host-one-${runId}`);
      const hostTwo = makeUser(`host-two-${runId}`);

      const hostOneApp = await createApp(browser);
      const hostTwoApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostOneApp,
          hostOne,
          sharedSkill,
          "12:00",
        );

        await prepareCatalogParticipant(
          hostTwoApp,
          hostTwo,
          sharedSkill,
          "13:00",
        );

        await test.step(
          "Гость: ищет общий навык двух участников",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              sharedSkill,
            );
          },
        );

        await test.step(
          "В выдаче видны обе конкретные карточки",
          async () => {
            const hostOneCard =
              guestApp.bookingPage.personCard(hostOne.name);

            const hostTwoCard =
              guestApp.bookingPage.personCard(hostTwo.name);

            await expect(hostOneCard).toBeVisible({
              timeout: 30_000,
            });

            await expect(hostTwoCard).toBeVisible({
              timeout: 30_000,
            });

            await expect(hostOneCard).toHaveCount(1);
            await expect(hostTwoCard).toHaveCount(1);
          },
        );
      } finally {
        await closeApps([
          hostOneApp,
          hostTwoApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "поиск оставляет подходящего участника и исключает неподходящего",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("filter");
      const matchingSkill = `Matching-${runId}`;
      const otherSkill = `Other-${runId}`;

      const matchingHost = makeUser(
        `matching-host-${runId}`,
      );

      const otherHost = makeUser(
        `other-host-${runId}`,
      );

      const matchingHostApp = await createApp(browser);
      const otherHostApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          matchingHostApp,
          matchingHost,
          matchingSkill,
          "12:00",
        );

        await prepareCatalogParticipant(
          otherHostApp,
          otherHost,
          otherSkill,
          "13:00",
        );

        await test.step(
          "Гость: отдельно ищет подходящего участника",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              matchingSkill,
            );
          },
        );

        await test.step(
          "Контроль: подходящий участник доступен в каталоге",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(
                matchingHost.name,
              ),
            ).toBeVisible({
              timeout: 30_000,
            });
          },
        );

        await test.step(
          "Гость: отдельно ищет второго участника по его навыку",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              otherSkill,
            );
          },
        );

        await test.step(
          "Контроль: второй участник также доступен в каталоге",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(
                otherHost.name,
              ),
            ).toBeVisible({
              timeout: 30_000,
            });
          },
        );

        await test.step(
          "Гость: выполняет итоговый поиск по первому навыку",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              matchingSkill,
            );
          },
        );

        await test.step(
          "Подходящий участник остаётся, неподходящий отсутствует",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(
                matchingHost.name,
              ),
            ).toBeVisible({
              timeout: 30_000,
            });

            await expect(
              guestApp.bookingPage.personCard(
                otherHost.name,
              ),
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([
          matchingHostApp,
          otherHostApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "участник без будущего свободного слота не попадает в каталог",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("slot-rule");
      const sharedSkill = `SlotRule-${runId}`;

      const eligibleHost = makeUser(
        `with-slot-${runId}`,
      );

      const noSlotHost = makeUser(
        `without-slot-${runId}`,
      );

      const eligibleHostApp = await createApp(browser);
      const noSlotHostApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          eligibleHostApp,
          eligibleHost,
          sharedSkill,
        );

        await registerWithSkill(
          noSlotHostApp,
          noSlotHost,
          sharedSkill,
        );

        await test.step(
          "Контроль: навык участника без слота сохранён в профиле",
          async () => {
            await expect(
              noSlotHostApp.profilePage.canHelpSkillItem(
                sharedSkill,
              ),
            ).toBeVisible();
          },
        );

        await test.step(
          "Гость: ищет общий навык двух участников",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              sharedSkill,
            );
          },
        );

        await test.step(
          "Участник со слотом виден, участник без слота отсутствует",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(
                eligibleHost.name,
              ),
            ).toBeVisible({
              timeout: 30_000,
            });

            await expect(
              guestApp.bookingPage.personCard(
                noSlotHost.name,
              ),
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([
          eligibleHostApp,
          noSlotHostApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "повторный поиск новым навыком обновляет выдачу",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("repeat-search");
      const skillA = `RepeatA-${runId}`;
      const skillB = `RepeatB-${runId}`;

      const hostA = makeUser(`host-a-${runId}`);
      const hostB = makeUser(`host-b-${runId}`);

      const hostAApp = await createApp(browser);
      const hostBApp = await createApp(browser);
      const guestApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostAApp,
          hostA,
          skillA,
          "12:00",
        );

        await prepareCatalogParticipant(
          hostBApp,
          hostB,
          skillB,
          "13:00",
        );

        await test.step(
          "Гость: открывает каталог и ищет первый навык",
          async () => {
            await guestApp.bookingPage.goToCatalog();

            await guestApp.bookingPage.searchCatalog(
              skillA,
            );
          },
        );

        await test.step(
          "После первого поиска виден первый участник",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(hostA.name),
            ).toBeVisible({
              timeout: 30_000,
            });

            await expect(
              guestApp.bookingPage.personCard(hostB.name),
            ).toHaveCount(0);
          },
        );

        await test.step(
          "Гость: без перезагрузки страницы ищет второй навык",
          async () => {
            await guestApp.bookingPage.searchCatalog(
              skillB,
            );
          },
        );

        await test.step(
          "После второго поиска выдача соответствует новому навыку",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(hostB.name),
            ).toBeVisible({
              timeout: 30_000,
            });

            await expect(
              guestApp.bookingPage.personCard(hostA.name),
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([
          hostAApp,
          hostBApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "авторизованный пользователь находит другого участника по уникальному навыку",
    async ({ browser }) => {
      test.setTimeout(120_000);

      const runId = makeRunId("authorized-search");
      const skill = `Authorized-${runId}`;

      const host = makeUser(`host-${runId}`);
      const searcher = makeUser(`searcher-${runId}`);

      const hostApp = await createApp(browser);
      const searcherApp = await createApp(browser);

      try {
        await prepareCatalogParticipant(
          hostApp,
          host,
          skill,
        );

        await test.step(
          "Второй пользователь: регистрируется",
          async () => {
            await registerUser(
              searcherApp.page,
              searcher,
            );
          },
        );

        await test.step(
          "Авторизованный пользователь: ищет навык другого участника",
          async () => {
            await searcherApp.bookingPage.goToCatalog();

            await searcherApp.bookingPage.searchCatalog(
              skill,
            );
          },
        );

        await test.step(
          "Авторизованный пользователь видит карточку другого участника",
          async () => {
            const hostCard =
              searcherApp.bookingPage.personCard(
                host.name,
              );

            await expect(hostCard).toBeVisible({
              timeout: 30_000,
            });

            await expect(hostCard).toHaveCount(1);
          },
        );
      } finally {
        await closeApps([
          hostApp,
          searcherApp,
        ]);
      }
    },
  );
});