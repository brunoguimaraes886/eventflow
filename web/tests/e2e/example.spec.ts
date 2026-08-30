import { test, expect } from '@playwright/test'

test('visitante navega da vitrine para o cadastro', async ({ page }) => {
  await page.goto('http://localhost:3000/')

  await expect(page.locator('h1')).toContainText('Palestras')

  await page.click('text=Cadastrar')

  await expect(page).toHaveURL('http://localhost:3000/cadastro')
  await expect(page.locator('h1')).toContainText('Criar conta')
})