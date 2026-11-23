import { Injectable } from "@nestjs/common";
import { TODO_STATUS, type Todo } from "../../../packages/shared/src/index";

@Injectable()
export class TodosService {
  private readonly todos: Todo[] = [
    {
      id: "1",
      title: "验证交付流水线",
      status: TODO_STATUS.pending,
      createdAt: new Date().toISOString(),
    },
  ];

  findAll(): Todo[] {
    return this.todos;
  }
}
