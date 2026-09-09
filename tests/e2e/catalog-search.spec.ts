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

const TEST_TIMEOUT = 60_000;
const CATALOG_RESULT_TIMEOUT = 30_000;

function makeRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function registerWithSkill(
  app: AppContext,
  user: TestUser,
  skill: string,
): Promise<void> {
  await test.step(
    `${user.name}: регистрируется и добавляет навык ${skill}`,
    async () => {
      await registerUser(app.page, user);

      await app.profilePage.goto();

      await app.profilePage.addSkill(
        skill,
        "can_help",
      );
    },
  );
}

async function addFutureSlot(
  app: AppContext,
  participantName: string,
  time = "12:00",
): Promise<void> {
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
): Promise<void> {
  await registerWithSkill(
    app,
    user,
    skill,
  );

  await addFutureSlot(
    app,
    user.name,
    time,
  );
}

test.describe("Поиск участников PomidorQA", () => {
  test.describe.configure({
    timeout: TEST_TIMEOUT,
  });

  test(
    "гость находит участника по уникальному навыку",
    async ({ browser }) => {
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

            await guestApp.bookingPage.searchCatalog(
              skill,
            );
          },
        );

        await test.step(
          "В выдаче видна карточка подготовленного участника",
          async () => {
            const hostCard =
              guestApp.bookingPage.personCard(
                host.name,
              );

            await expect(
              hostCard,
              `Гость должен видеть участника ${host.name} ` +
                `по уникальному навыку ${skill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              hostCard,
              `В выдаче должна быть ровно одна карточка ` +
                `участника ${host.name}`,
            ).toHaveCount(1);
          },
        );
      } finally {
        await closeApps([
          hostApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "несуществующий навык возвращает пустую выдачу",
    async ({ browser }) => {
      const runId = makeRunId("empty-search");

      const existingSkill =
        `Existing-${runId}`;

      const missingSkill =
        `Missing-${runId}`;

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
              guestApp.bookingPage.personCard(
                host.name,
              ),
              `Positive control: участник ${host.name} ` +
                `должен находиться по навыку ${existingSkill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
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
              guestApp.bookingPage.personCard(
                host.name,
              ),
              `После поиска ${missingSkill} ранее видимая ` +
                `карточка ${host.name} должна исчезнуть`,
            ).toHaveCount(0);

            await expect(
              guestApp.bookingPage.personCards,
              `Для заведомо несуществующего навыка ` +
                `${missingSkill} выдача должна быть пустой`,
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([
          hostApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "авторизованный пользователь не видит собственную карточку, а гость видит",
    async ({ browser }) => {
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

            await guestApp.bookingPage.searchCatalog(
              skill,
            );
          },
        );

        await test.step(
          "Контроль: гость видит карточку участника",
          async () => {
            await expect(
              guestApp.bookingPage.personCard(
                host.name,
              ),
              `Positive control: карточка ${host.name} ` +
                `должна быть публично доступна гостю`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });
          },
        );

        await test.step(
          "Авторизованный участник: ищет собственный уникальный навык",
          async () => {
            await hostApp.bookingPage.goToCatalog();

            await hostApp.bookingPage.searchCatalog(
              skill,
            );
          },
        );

        await test.step(
          "Авторизованный участник не видит собственную карточку",
          async () => {
            await expect(
              hostApp.bookingPage.personCard(
                host.name,
              ),
              `Авторизованный пользователь ${host.name} ` +
                `не должен видеть собственную карточку`,
            ).toHaveCount(0);

            await expect(
              hostApp.bookingPage.personCards,
              `Уникальный навык ${skill} принадлежит только ` +
                `текущему пользователю, поэтому его выдача ` +
                `для самого пользователя должна быть пустой`,
            ).toHaveCount(0);
          },
        );
      } finally {
        await closeApps([
          hostApp,
          guestApp,
        ]);
      }
    },
  );

  test(
    "гость видит двух участников с одинаковым навыком",
    async ({ browser }) => {
      const runId = makeRunId("shared-skill");

      const sharedSkill =
        `SharedSkill-${runId}`;

      const hostOne =
        makeUser(`host-one-${runId}`);

      const hostTwo =
        makeUser(`host-two-${runId}`);

      const hostOneApp =
        await createApp(browser);

      const hostTwoApp =
        await createApp(browser);

      const guestApp =
        await createApp(browser);

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
              guestApp.bookingPage.personCard(
                hostOne.name,
              );

            const hostTwoCard =
              guestApp.bookingPage.personCard(
                hostTwo.name,
              );

            await expect(
              hostOneCard,
              `Первый участник ${hostOne.name} должен ` +
                `быть найден по общему навыку ${sharedSkill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              hostTwoCard,
              `Второй участник ${hostTwo.name} должен ` +
                `быть найден по общему навыку ${sharedSkill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              hostOneCard,
              `Карточка ${hostOne.name} не должна ` +
                `дублироваться в выдаче`,
            ).toHaveCount(1);

            await expect(
              hostTwoCard,
              `Карточка ${hostTwo.name} не должна ` +
                `дублироваться в выдаче`,
            ).toHaveCount(1);
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
      const runId = makeRunId("filter");

      const matchingSkill =
        `Matching-${runId}`;

      const otherSkill =
        `Other-${runId}`;

      const matchingHost = makeUser(
        `matching-host-${runId}`,
      );

      const otherHost = makeUser(
        `other-host-${runId}`,
      );

      const matchingHostApp =
        await createApp(browser);

      const otherHostApp =
        await createApp(browser);

      const guestApp =
        await createApp(browser);

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
              `Positive control: ${matchingHost.name} ` +
                `должен находиться по ${matchingSkill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
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
              `Positive control: ${otherHost.name} ` +
                `должен находиться по ${otherSkill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
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
              `Итоговая выдача по ${matchingSkill} ` +
                `должна содержать ${matchingHost.name}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              guestApp.bookingPage.personCard(
                otherHost.name,
              ),
              `Итоговая выдача по ${matchingSkill} ` +
                `не должна содержать ${otherHost.name}, ` +
                `у которого навык ${otherSkill}`,
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
      const runId = makeRunId("slot-rule");

      const sharedSkill =
        `SlotRule-${runId}`;

      const eligibleHost = makeUser(
        `with-slot-${runId}`,
      );

      const noSlotHost = makeUser(
        `without-slot-${runId}`,
      );

      const eligibleHostApp =
        await createApp(browser);

      const noSlotHostApp =
        await createApp(browser);

      const guestApp =
        await createApp(browser);

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
              `Positive control: у ${noSlotHost.name} ` +
                `действительно должен быть навык ${sharedSkill}`,
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
              `Участник ${eligibleHost.name} с будущим ` +
                `свободным слотом должен быть в каталоге`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              guestApp.bookingPage.personCard(
                noSlotHost.name,
              ),
              `Участник ${noSlotHost.name} без будущего ` +
                `свободного слота не должен быть в каталоге`,
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
      const runId = makeRunId("repeat-search");

      const skillA =
        `RepeatA-${runId}`;

      const skillB =
        `RepeatB-${runId}`;

      const hostA =
        makeUser(`host-a-${runId}`);

      const hostB =
        makeUser(`host-b-${runId}`);

      const hostAApp =
        await createApp(browser);

      const hostBApp =
        await createApp(browser);

      const guestApp =
        await createApp(browser);

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
              guestApp.bookingPage.personCard(
                hostA.name,
              ),
              `Первая выдача по ${skillA} должна ` +
                `содержать ${hostA.name}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              guestApp.bookingPage.personCard(
                hostB.name,
              ),
              `Первая выдача по ${skillA} не должна ` +
                `содержать ${hostB.name}`,
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
              guestApp.bookingPage.personCard(
                hostB.name,
              ),
              `После повторного поиска по ${skillB} ` +
                `должен появиться ${hostB.name}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              guestApp.bookingPage.personCard(
                hostA.name,
              ),
              `После повторного поиска по ${skillB} ` +
                `старая карточка ${hostA.name} должна исчезнуть`,
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
      const runId =
        makeRunId("authorized-search");

      const skill =
        `Authorized-${runId}`;

      const host =
        makeUser(`host-${runId}`);

      const searcher =
        makeUser(`searcher-${runId}`);

      const hostApp =
        await createApp(browser);

      const searcherApp =
        await createApp(browser);

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

            await expect(
              hostCard,
              `Авторизованный пользователь ${searcher.name} ` +
                `должен видеть ${host.name} по навыку ${skill}`,
            ).toBeVisible({
              timeout: CATALOG_RESULT_TIMEOUT,
            });

            await expect(
              hostCard,
              `Карточка ${host.name} должна присутствовать ` +
                `в выдаче ровно один раз`,
            ).toHaveCount(1);
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