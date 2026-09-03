import { test, expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage 
{
    //имя
    nameInput: Locator;
    //телеграмм
    telegramInput: Locator;
    //выбор таймзоны
    timezoneSelect: Locator;
    //кнопка сохранения
    saveButton: Locator;
    //навыки
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
    skillChips: Locator;    
}

constructor (page:Page) 
{
    this.nameInput = page.getByLabel("Имя");
    this.telegramInput = page.getByLabel("Telegram");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.saveButton = page.getByRole("button", { name: "Сохранить" });
    // навыки
    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.skillChips = page.locator("[data-skill-tag]");
}
