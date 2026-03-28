import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService{
    constructor(private readonly projectsRepository: ProjectsRepository) {}

    private generateSlug(name: string): string {
    // "My Cool API" → "my-cool-api"
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')  // strip special chars
      .replace(/\s+/g, '-');          // spaces to hyphens
  }

    async create(userId: string, dto: CreateProjectDto){
        const slug = this.generateSlug(dto.name);

        const existing = await this.projectsRepository.findBySlug(slug);
        if (existing) throw new ConflictException('Project name already taken, try a different one!');

        return this.projectsRepository.create({
            name: dto.name,
            upstreamUrl: dto.upstreamUrl,
            userId,
            slug,
        });
    }

    async findOne(id: string, userId: string){
        const project = await this.projectsRepository.findByIdAndUser(id, userId);

        if(!project) throw new NotFoundException('Project not found');
        return project;
    }

    async findAll(userId: string){
        return this.projectsRepository.findAllByUser(userId);
    }

    async update(id: string, userId: string, dto: UpdateProjectDto){
        await this.findOne(id, userId);

        const data: { name?: string; upstreamUrl?: string; slug?: string} = {};

        if(dto.name){
            data.name = dto.name;
            data.slug = this.generateSlug(dto.name);
        

            const existing = await this.projectsRepository.findBySlug(data.slug);

            if (existing && existing.id !== id) {
            throw new ConflictException('Project name already taken, try a different one');
            }
        }

        if (dto.upstreamUrl) data.upstreamUrl = dto.upstreamUrl;

        return this.projectsRepository.update(id, data);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId);
        return this.projectsRepository.delete(id);
    }
}