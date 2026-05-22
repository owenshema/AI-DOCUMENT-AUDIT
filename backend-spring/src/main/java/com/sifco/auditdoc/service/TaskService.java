package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public Page<Task> getAll(int page, int size) {
        return taskRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Page<Task> getMyTasks(String userId, int page, int size) {
        return taskRepository.findByAssignedToOrderByDueDateAsc(userId, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Task getById(String id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    @Transactional
    public Task create(Task task, String userId) {
        task.setAssignedBy(userId);
        task.setStatus(Task.TaskStatus.PENDING);
        return taskRepository.save(task);
    }

    @Transactional
    public Task update(String id, Task updates) {
        Task existing = getById(id);
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getNotes() != null) existing.setNotes(updates.getNotes());
        if (updates.getDueDate() != null) existing.setDueDate(updates.getDueDate());
        if (updates.getAssignedTo() != null) existing.setAssignedTo(updates.getAssignedTo());
        return taskRepository.save(existing);
    }

    @Transactional
    public void delete(String id) {
        taskRepository.deleteById(id);
    }
}
