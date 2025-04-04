import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  PayFastCustomIntegrationService
} from "./services"

const services = [
  PayFastCustomIntegrationService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
