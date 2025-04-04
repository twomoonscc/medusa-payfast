import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  MedusaCustomIntegrationService
} from "./services"

const services = [
  MedusaCustomIntegrationService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
