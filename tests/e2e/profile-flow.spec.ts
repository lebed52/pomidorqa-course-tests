import { test, expect } from "@playwright/test";
import { TestUser, makeUser, registerUser, changeUserName } from "../helpers/user";
import { ProfilePage } from "../Pages/profile-page";



  test.describe("Проведение практики", () => {
    let user: TestUser;
    let profilePage: ProfilePage

    test.beforeEach(async ({ page }) => {   
        const runId = Date.now();
        user = makeUser("Jango", runId);
        profilePage = new ProfilePage(page);
        await registerUser(page, user);
        await profilePage.page.goto("/pomidorqa/profile");
        await expect(profilePage.page).toHaveURL(/\/pomidorqa\/profile/);
    });

    test("Смена имени в профиле", async () => {
        const changedUserName = changeUserName(user.name);

        await test.step("Смена имени в профиле", async () => {
            await profilePage.profileNameInput.fill(changedUserName.newName);
            await profilePage.save();
        });

        await test.step("Проверка заполнения поля name", async () => {
            await expect(profilePage.profileNameInput).toHaveValue(changedUserName.newName);
        });
    });

    test("Заполнение поля telegram", async () => {
        const telegram = "@jangofett";

        await test.step("Заполнение поля telegram", async () => {
            await profilePage.profileTelegramInput.fill(telegram);
            await profilePage.save();
        });
        
        await test.step("Проверка заполнения поля telegram", async () => {
            await expect(profilePage.profileTelegramInput).toHaveValue(telegram);
        });
    });

    test("Изменение часового пояса", async () => {
        await test.step("Изменение часового пояса", async () => {
            await profilePage.profileTimezoneSelect.selectOption("Asia/Yekaterinburg");
            await profilePage.save();
        });

        await test.step("Проверка заполнения поля timezone", async () => {
            await expect(profilePage.profileTimezoneSelect).toHaveValue("Asia/Yekaterinburg");
        });
    });

    test("Добавление информации о себе", async () => {
        const about = "I'm a Jedi"

        await test.step("Заполнение поля about", async () => {
            await profilePage.profileAboutInput.fill(about);
            await profilePage.save();
        });

        await test.step("Проверка заполнения поля about", async () => {
            await expect(profilePage.profileAboutInput).toHaveValue(about);
        });
    });

    test("Добавление навыка", async () => {
        const skillName = "Brainfuck";

        await test.step("Добавление навыка", async () => {
            await profilePage.skillInput.fill(skillName);
            await profilePage.skillTypeSelect.selectOption("can_help");
            await profilePage.addSkillButton.click();
        });

        await test.step("Проверка заполнения поля can_help", async () => {
            await expect(profilePage.canHelpSkills).toContainText(skillName);
        });
    });

    test("Ввод кириллических символов в поле Telegram", async () => {
        const telegram = "Янго Фе́тт";

        await test.step("Заполнение поля telegram", async () => {
            await profilePage.profileTelegramInput.fill(telegram);
            await profilePage.save();
        });

        await test.step("Проверка заполнения поля telegram", async () => {
            await expect(profilePage.profileTelegramInput).toHaveValue(telegram);
        });
    });

    test("Сохранение пустого значения в поле Имя", async () => {
        await test.step("Заполнение поля name", async () => {
            await profilePage.profileNameInput.fill("");
            await profilePage.profileSaveButton.click();
        });

        await profilePage.page.reload();

        await test.step("Проверка заполнения поля name", async () => {
            await expect(profilePage.profileNameInput).toHaveValue(user.name);
        });
    });

    test("Добавление навыка с пустым названием", async () => {
        const skillName = "";

        await test.step("Добавление навыка", async () => {
            await profilePage.skillInput.fill(skillName);
            await profilePage.skillTypeSelect.selectOption("can_help");
            await profilePage.addSkillButton.click();
        });

        await test.step("Проверка заполнения поля can_help", async () => {
            await expect(profilePage.canHelpSkills).toHaveCount(0);
            await expect(profilePage.canHelpSkills).not.toBeVisible();
        });
    });
});
