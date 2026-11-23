import { Controller, Get } from "@nestjs/common";
import { TodosService } from "./todos.service";
import { API_ROUTES } from "../../../packages/shared/src/index";

const TODOS_PATH = API_ROUTES.todos.replace(/^\//, "");

@Controller(TODOS_PATH)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll() {
    return this.todosService.findAll();
  }
}
