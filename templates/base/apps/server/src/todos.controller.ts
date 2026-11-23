import { Controller, Get } from "@nestjs/common";
import { Can } from "@nestjs/authorization";
import { TodosService } from "./todos.service";
import { TodoPolicy } from "./todo.policy";
import { API_ROUTES } from "../../../packages/shared/src/index";

const TODOS_PATH = API_ROUTES.todos.replace(/^\//, "");

@Controller(TODOS_PATH)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /** 示例：用官方 @Can() 声明权限；未声明的路由会被 AuthorizationGuard 拒绝 */
  @Can(TodoPolicy, "view")
  @Get()
  findAll() {
    return this.todosService.findAll();
  }
}
